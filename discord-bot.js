import { Client, GatewayIntentBits, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, discordAccounts, tradeJournalEntries, tickets, ticketMessages, ticketAssignments } from './shared/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database connection
const connectionString = process.env.DATABASE_URL;
const postgresClient = postgres(connectionString);
const db = drizzle(postgresClient);

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

// News channel ID for forex news feed
const NEWS_CHANNEL_ID = '1413055341150863360';

// Hash password function (should match the web app's hashing)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Forex News Feed Functionality
async function fetchForexNews() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nfs.faireconomy.media',
      path: '/ff_calendar_thisweek.json',
      method: 'GET'
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const newsData = JSON.parse(data);
          resolve(newsData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Store last sent news IDs to avoid duplicates
const sentNewsIds = new Set();

async function sendForexNews() {
  try {
    console.log(`📰 Checking forex news... Channel ID: ${NEWS_CHANNEL_ID}`);
    
    const newsChannel = await client.channels.fetch(NEWS_CHANNEL_ID);
    if (!newsChannel || !newsChannel.isTextBased()) {
      console.log('❌ News channel not found or is not text-based');
      return;
    }

    console.log(`✅ News channel found: ${newsChannel.name}`);
    
    const newsData = await fetchForexNews();
    console.log(`📊 Fetched ${newsData.length} news items from ForexFactory`);
    
    // Get current time
    const now = new Date();
    const nowTime = now.getTime();
    
    // Filter recent news (within last 15 minutes)
    const recentNews = newsData.filter(item => {
      const newsTime = new Date(item.date).getTime();
      const timeDiff = nowTime - newsTime;
      const newsId = `${item.date}_${item.title}`;
      
      // Return news that's recent and hasn't been sent yet
      return timeDiff >= 0 && timeDiff <= 900000 && !sentNewsIds.has(newsId);
    });

    console.log(`🔔 Found ${recentNews.length} new recent news items to send`);

    // Send each news item
    for (const newsItem of recentNews) {
      const newsId = `${newsItem.date}_${newsItem.title}`;
      
      // Determine impact color
      let color = 0x6b7280; // Gray for low
      if (newsItem.impact === 'High') color = 0xef4444; // Red
      else if (newsItem.impact === 'Medium') color = 0xf59e0b; // Orange
      
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`📰 ${newsItem.title}`)
        .setDescription(newsItem.country || 'Global')
        .addFields(
          { name: '🕐 Time', value: new Date(newsItem.date).toLocaleString(), inline: true },
          { name: '⚡ Impact', value: newsItem.impact || 'N/A', inline: true },
          { name: '📊 Forecast', value: newsItem.forecast || 'N/A', inline: true },
          { name: '📈 Previous', value: newsItem.previous || 'N/A', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'ATHENIUM Forex News Feed' });

      try {
        await newsChannel.send({ embeds: [embed] });
        console.log(`✅ Sent news: ${newsItem.title}`);
        sentNewsIds.add(newsId);
      } catch (sendError) {
        console.error(`❌ Error sending news embed: ${sendError.message}`);
      }
      
      // Clean up old IDs (keep only last 1000)
      if (sentNewsIds.size > 1000) {
        const idsArray = Array.from(sentNewsIds);
        idsArray.slice(0, 500).forEach(id => sentNewsIds.delete(id));
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (recentNews.length === 0) {
      console.log('ℹ️ No new news items to send at this time');
    }
  } catch (error) {
    console.error('❌ Error fetching or sending forex news:', error);
    console.error('Error details:', error.message);
  }
}

// Start news feed interval (check every 5 minutes)
function startNewsFeed() {
  console.log('📰 Starting forex news feed...');
  // Run immediately
  sendForexNews();
  // Then run every 5 minutes
  setInterval(sendForexNews, 5 * 60 * 1000);
}

// Ticket management functions
async function createTicketChannel(guild, user, ticketTitle, ticketDescription, category, priority) {
  try {
    // Create a tickets category if it doesn't exist
    let ticketCategory = guild.channels.cache.find(c => c.name === 'SUPPORT TICKETS' && c.type === ChannelType.GuildCategory);
    if (!ticketCategory) {
      ticketCategory = await guild.channels.create({
        name: 'SUPPORT TICKETS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });
    }

    // Create ticket channel
    const ticketChannel = await guild.channels.create({
      name: `ticket-${user.username}-${Date.now()}`,
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    });

    return ticketChannel;
  } catch (error) {
    console.error('Error creating ticket channel:', error);
    return null;
  }
}

async function closeTicket(interaction, ticketId) {
  try {
    // Update ticket status in database
    await db.update(tickets)
      .set({ 
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tickets.id, parseInt(ticketId)));

    // Delete the channel after a delay
    await interaction.reply({
      content: '🎫 **Ticket Closed**\nThis ticket has been marked as resolved. The channel will be deleted in 10 seconds.',
      ephemeral: false
    });

    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (error) {
        console.error('Error deleting ticket channel:', error);
      }
    }, 10000);

  } catch (error) {
    console.error('Error closing ticket:', error);
    await interaction.reply({
      content: '❌ Error closing the ticket.',
      ephemeral: false
    });
  }
}

async function claimTicket(interaction, ticketId) {
  try {
    // Check if user has admin permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: '❌ You need Manage Channels permission to claim tickets.',
        ephemeral: false
      });
      return;
    }

    // Update ticket assignment
    await db.update(tickets)
      .set({ 
        assignedTo: interaction.user.id,
        status: 'in_progress',
        updatedAt: new Date()
      })
      .where(eq(tickets.id, parseInt(ticketId)));

    // Record assignment
    await db.insert(ticketAssignments).values({
      ticketId: parseInt(ticketId),
      adminId: interaction.user.id,
      adminName: interaction.user.username,
    });

    await interaction.reply({
      content: `✅ **Ticket Claimed**\n${interaction.user} has been assigned to this ticket and will provide assistance.`,
      ephemeral: false
    });

  } catch (error) {
    console.error('Error claiming ticket:', error);
    await interaction.reply({
      content: '❌ Error claiming the ticket.',
      ephemeral: false
    });
  }
}

async function escalateTicket(interaction, ticketId) {
  try {
    // Update ticket priority and status
    await db.update(tickets)
      .set({ 
        priority: 'urgent',
        status: 'escalated',
        updatedAt: new Date()
      })
      .where(eq(tickets.id, parseInt(ticketId)));

    await interaction.reply({
      content: '🚨 **Ticket Escalated**\nThis ticket has been escalated to urgent priority and will receive immediate attention.',
      ephemeral: false
    });

  } catch (error) {
    console.error('Error escalating ticket:', error);
    await interaction.reply({
      content: '❌ Error escalating the ticket.',
      ephemeral: false
    });
  }
}

async function archiveTicket(interaction, ticketId) {
  try {
    // Update ticket status
    await db.update(tickets)
      .set({ 
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tickets.id, parseInt(ticketId)));

    await interaction.reply({
      content: '📁 **Ticket Archived**\nThis ticket has been archived and moved to the archived tickets list.',
      ephemeral: false
    });

  } catch (error) {
    console.error('Error archiving ticket:', error);
    await interaction.reply({
      content: '❌ Error archiving the ticket.',
      ephemeral: false
    });
  }
}

// Calculate user statistics from trade journal
async function calculateUserStats(userId) {
  try {
    // Get all trades for the user
    const trades = await db.select().from(tradeJournalEntries).where(eq(tradeJournalEntries.userId, userId));
    
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        successRate: 0.0,
        monthlyPL: 0.0,
        riskRewardRatio: 0.0
      };
    }

    const totalTrades = trades.length;
    const profitTrades = trades.filter(trade => trade.tradeType === 'profit').length;
    const successRate = ((profitTrades / totalTrades) * 100).toFixed(1);
    
    // Calculate monthly P&L (sum of all trade amounts)
    const monthlyPL = trades.reduce((sum, trade) => {
      const amount = parseFloat(trade.amount);
      return sum + amount;
    }, 0);

    // Risk/Reward ratio calculation (simplified - average profit vs average loss)
    const profitAmounts = trades.filter(trade => trade.tradeType === 'profit').map(trade => parseFloat(trade.amount));
    const lossAmounts = trades.filter(trade => trade.tradeType === 'loss').map(trade => Math.abs(parseFloat(trade.amount)));
    
    let riskRewardRatio = 0.0;
    if (profitAmounts.length > 0 && lossAmounts.length > 0) {
      const avgProfit = profitAmounts.reduce((a, b) => a + b, 0) / profitAmounts.length;
      const avgLoss = lossAmounts.reduce((a, b) => a + b, 0) / lossAmounts.length;
      riskRewardRatio = avgLoss > 0 ? (avgProfit / avgLoss).toFixed(1) : 0.0;
    }

    return {
      totalTrades,
      successRate: parseFloat(successRate),
      monthlyPL: monthlyPL.toFixed(2),
      riskRewardRatio: parseFloat(riskRewardRatio)
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return {
      totalTrades: 0,
      successRate: 0.0,
      monthlyPL: 0.0,
      riskRewardRatio: 0.0
    };
  }
}

// Early Access Signup Functions
const SIGNUPS_FILE = path.join(__dirname, 'early-access-signups.json');

function readSignups() {
  try {
    if (!fs.existsSync(SIGNUPS_FILE)) {
      fs.writeFileSync(SIGNUPS_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(SIGNUPS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading signups file:', error);
    return [];
  }
}

function writeSignups(signups) {
  try {
    fs.writeFileSync(SIGNUPS_FILE, JSON.stringify(signups, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing signups file:', error);
    return false;
  }
}

function addSignup(userId, username) {
  const signups = readSignups();
  
  // Check if user already signed up
  if (signups.find(s => s.userId === userId)) {
    return false; // Already signed up
  }
  
  signups.push({
    userId,
    username,
    timestamp: new Date().toISOString()
  });
  
  return writeSignups(signups);
}

// Function to force refresh Discord commands
async function forceRefreshCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('login')
      .setDescription('Vincula tu cuenta de Discord con tu cuenta web de ATHENIUM'),
    
    new SlashCommandBuilder()
      .setName('data')
      .setDescription('Muestra la información de tu cuenta y estadísticas de trading'),
    
    new SlashCommandBuilder()
      .setName('journal')
      .setDescription('Registra una entrada de trading en tu diario'),
    
    new SlashCommandBuilder()
      .setName('trades')
      .setDescription('Muestra todos tus trades registrados en el diario'),
    
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Muestra la lista de comandos disponibles del bot'),
    
    new SlashCommandBuilder()
      .setName('embed')
      .setDescription('Envía un embed personalizado a un canal específico')
      .addChannelOption(option =>
        option.setName('canal')
          .setDescription('Menciona el canal donde enviar el embed')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)),
    
    new SlashCommandBuilder()
      .setName('picture')
      .setDescription('Envía una imagen a un canal específico')
      .addStringOption(option =>
        option.setName('canal')
          .setDescription('ID del canal donde enviar la imagen')
          .setRequired(true))
      .addAttachmentOption(option =>
        option.setName('imagen')
          .setDescription('La imagen a enviar')
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName('ticketsend')
      .setDescription('Send ticket system message with button to create support tickets')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Channel to send the ticket message')
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName('earlyaccess')
      .setDescription('Send early access signup embed with button')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(option =>
        option.setName('title')
          .setDescription('Embed title')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('description')
          .setDescription('Embed description')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('color')
          .setDescription('Embed color (hex format: #1e40af or 0x1e40af)')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('button_text')
          .setDescription('Button text')
          .setRequired(false)),

    new SlashCommandBuilder()
      .setName('checkea')
      .setDescription('View all early access signups')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('rules')
      .setDescription('Display server rules')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(option =>
        option.setName('title')
          .setDescription('Embed title')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('color')
          .setDescription('Embed color (hex format: #1e40af or 0x1e40af)')
          .setRequired(false)),

    new SlashCommandBuilder()
      .setName('vision')
      .setDescription('Display community vision and mission')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(option =>
        option.setName('title')
          .setDescription('Embed title')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('color')
          .setDescription('Embed color (hex format: #1e40af or 0x1e40af)')
          .setRequired(false))
  ];

  try {
    console.log('🔄 Force refreshing Discord slash commands...');
    
    // First, clear all existing commands to ensure a clean slate
    const guild = client.guilds.cache.get('1413053989796319317');
    if (guild) {
      console.log('🗑️ Clearing existing guild commands...');
      await guild.commands.set([]);
      console.log('✅ Guild commands cleared, now registering new commands...');
      await guild.commands.set(commands);
      console.log('✅ Discord slash commands registered locally for guild 1413053989796319317!');
    } else {
      console.log('⚠️ Guild 1413053989796319317 not found, using global commands...');
      console.log('🗑️ Clearing existing global commands...');
      await client.application.commands.set([]);
      console.log('✅ Global commands cleared, now registering new commands...');
      await client.application.commands.set(commands);
      console.log('✅ Discord slash commands registered globally!');
    }
    
    // Wait a bit for Discord to process the changes
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('🎉 Command refresh complete! All commands should now be available.');
    
  } catch (error) {
    console.error('❌ Error during command refresh:', error);
    console.log('🔄 Retrying command registration in 5 seconds...');
    setTimeout(() => forceRefreshCommands(), 5000);
  }
}

// Bot ready event
client.once('ready', async () => {
  console.log(`🤖 Discord bot logged in as ${client.user.tag}!`);
  
  // Force refresh commands on startup
  await forceRefreshCommands();
  
  // Start forex news feed
  startNewsFeed();
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() && !interaction.isModalSubmit() && !interaction.isButton()) return;

  // Handle button interactions
  if (interaction.isButton()) {
    const customId = interaction.customId;
    
    if (customId.startsWith('ticket_claim_')) {
      const ticketId = customId.replace('ticket_claim_', '');
      await claimTicket(interaction, ticketId);
    }
    else if (customId.startsWith('ticket_close_')) {
      const ticketId = customId.replace('ticket_close_', '');
      await closeTicket(interaction, ticketId);
    }
    else if (customId.startsWith('ticket_escalate_')) {
      const ticketId = customId.replace('ticket_escalate_', '');
      await escalateTicket(interaction, ticketId);
    }
    else if (customId.startsWith('ticket_archive_')) {
      const ticketId = customId.replace('ticket_archive_', '');
      await archiveTicket(interaction, ticketId);
    }
    else if (customId === 'early_access_signup') {
      // Handle early access signup
      const success = addSignup(interaction.user.id, interaction.user.username);
      
      if (success) {
        await interaction.reply({
          content: "✅ You've signed up to athenium early access. We'll keep you updated about our official launch, and special offers prepared for you, stay tuned!",
          ephemeral: false
        });
      } else {
        await interaction.reply({
          content: "ℹ️ You're already signed up for early access!",
          ephemeral: false
        });
      }
    }
    else if (customId === 'create_ticket') {
      // Create ticket modal
      const modal = new ModalBuilder()
        .setCustomId('ticket_modal')
        .setTitle('Create Support Ticket');

      const issueInput = new TextInputBuilder()
        .setCustomId('ticket_issue')
        .setLabel('Issue Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Brief description of your issue...')
        .setRequired(true)
        .setMaxLength(100);

      const descriptionInput = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Detailed Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Please provide as much detail as possible...')
        .setRequired(true)
        .setMaxLength(1000);

      const categoryInput = new TextInputBuilder()
        .setCustomId('ticket_category')
        .setLabel('Category')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Technical, Billing, General, etc.')
        .setRequired(true)
        .setMaxLength(50);

      const priorityInput = new TextInputBuilder()
        .setCustomId('ticket_priority')
        .setLabel('Priority')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('low, medium, high, or urgent')
        .setRequired(true)
        .setMaxLength(10);

      const issueRow = new ActionRowBuilder().addComponents(issueInput);
      const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
      const categoryRow = new ActionRowBuilder().addComponents(categoryInput);
      const priorityRow = new ActionRowBuilder().addComponents(priorityInput);

      modal.addComponents(issueRow, descriptionRow, categoryRow, priorityRow);

      await interaction.showModal(modal);
    }
    return;
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    try {
      if (interaction.customId === 'login_modal') {
        const email = interaction.fields.getTextInputValue('email_input');
        const password = interaction.fields.getTextInputValue('password_input');

        // Hash the password
        const hashedPassword = hashPassword(password);

        // Find user by email and password
        const user = await db.select()
          .from(users)
          .where(and(
            eq(users.email, email),
            eq(users.password, hashedPassword)
          ))
          .limit(1);

        if (user.length === 0) {
          await interaction.reply({
            content: '❌ Invalid credentials. Please check your email and password.',
            ephemeral: true
          });
          return;
        }

        // Check if Discord account is already linked
        const existingLink = await db.select()
          .from(discordAccounts)
          .where(eq(discordAccounts.discordId, interaction.user.id))
          .limit(1);

        if (existingLink.length > 0) {
          await interaction.reply({
            content: '❌ This Discord account is already linked to an Athenium account.',
            ephemeral: true
          });
          return;
        }

        // Link the accounts
        await db.insert(discordAccounts).values({
          userId: user[0].id,
          discordId: interaction.user.id,
          discordUsername: interaction.user.username
        });

        await interaction.reply({
          content: '✅ **Account Linked Successfully!**\n\nYour Discord account has been linked to your Athenium account. You can now use all bot commands.',
          ephemeral: true
        });
      }
      
      else if (interaction.customId === 'ticket_modal') {
        // Get Discord account link to get userId
        const discordAccount = await db.select()
          .from(discordAccounts)
          .where(eq(discordAccounts.discordId, interaction.user.id))
          .limit(1);

        let userId = null;
        if (discordAccount.length > 0) {
          userId = discordAccount[0].userId;
        }

        const issue = interaction.fields.getTextInputValue('ticket_issue');
        const description = interaction.fields.getTextInputValue('ticket_description');
        const category = interaction.fields.getTextInputValue('ticket_category');
        const priority = interaction.fields.getTextInputValue('ticket_priority').toLowerCase();

        // Validate priority
        if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
          await interaction.reply({
            content: '❌ Invalid priority. Please use: low, medium, high, or urgent',
            ephemeral: false
          });
          return;
        }

        // Create ticket channel
        const ticketChannel = await createTicketChannel(
          interaction.guild,
          interaction.user,
          issue,
          description,
          category,
          priority
        );

        if (!ticketChannel) {
          await interaction.reply({
            content: '❌ Error creating ticket channel. Please contact an administrator.',
            ephemeral: false
          });
          return;
        }

        // Insert ticket into database
        const newTicket = await db.insert(tickets).values({
          userId: userId,
          discordUserId: interaction.user.id,
          discordChannelId: ticketChannel.id,
          title: issue,
          description: description,
          category: category,
          priority: priority,
          status: 'open'
        }).returning();

        const ticketId = newTicket[0].id;

        // Create ticket embed
        const ticketEmbed = new EmbedBuilder()
          .setColor(priority === 'urgent' ? 0xff0000 : priority === 'high' ? 0xff6600 : 0x1e40af)
          .setTitle(`🎫 Support Ticket #${ticketId}`)
          .setDescription(`**${issue}**\n\n${description}`)
          .addFields(
            { name: '👤 Created by', value: `${interaction.user}`, inline: true },
            { name: '📋 Category', value: category, inline: true },
            { name: '⚡ Priority', value: priority, inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            { name: '🔄 Status', value: 'Open', inline: true },
            { name: '👨‍💼 Assigned', value: 'Unassigned', inline: true }
          )
          .setFooter({ text: `Ticket ID: ${ticketId} • ATHENIUM Support` })
          .setTimestamp();

        // Create management buttons
        const claimButton = new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticketId}`)
          .setLabel('🙋‍♂️ Claim Ticket')
          .setStyle(ButtonStyle.Success);

        const escalateButton = new ButtonBuilder()
          .setCustomId(`ticket_escalate_${ticketId}`)
          .setLabel('🚨 Escalate')
          .setStyle(ButtonStyle.Danger);

        const closeButton = new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketId}`)
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Secondary);

        const archiveButton = new ButtonBuilder()
          .setCustomId(`ticket_archive_${ticketId}`)
          .setLabel('📁 Archive')
          .setStyle(ButtonStyle.Secondary);

        const managementRow = new ActionRowBuilder().addComponents(claimButton, escalateButton, closeButton, archiveButton);

        // Send ticket information to the channel
        await ticketChannel.send({
          content: `${interaction.user} **Welcome to your support ticket!**\n\nOur support team has been notified and will assist you shortly. Please provide any additional information that might help us resolve your issue.`,
          embeds: [ticketEmbed],
          components: [managementRow]
        });

        // Record initial message
        await db.insert(ticketMessages).values({
          ticketId: ticketId,
          authorId: interaction.user.id,
          authorName: interaction.user.username,
          messageContent: `Ticket created: ${issue}\n\nDescription: ${description}`,
          isStaff: false
        });

        // Notify user
        await interaction.reply({
          content: `✅ **Support ticket created successfully!**\n\nYour ticket: ${ticketChannel}\nTicket ID: #${ticketId}\n\nOur support team will assist you shortly.`,
          ephemeral: false
        });

        // Notify staff in a log channel (if exists)
        const logChannel = interaction.guild.channels.cache.find(c => c.name === 'ticket-logs');
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(0xffff00)
            .setTitle('📋 New Support Ticket')
            .setDescription(`**Ticket #${ticketId}** created by ${interaction.user}`)
            .addFields(
              { name: 'Issue', value: issue },
              { name: 'Category', value: category, inline: true },
              { name: 'Priority', value: priority, inline: true },
              { name: 'Channel', value: `${ticketChannel}` }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }

    else if (interaction.customId === 'journal_modal') {
      // Get Discord account link
      const discordAccount = await db.select()
        .from(discordAccounts)
        .where(eq(discordAccounts.discordId, interaction.user.id))
        .limit(1);

      if (discordAccount.length === 0) {
        await interaction.reply({
          content: '❌ Your account is not linked to Athenium.',
          ephemeral: false
        });
        return;
      }

      const ticker = interaction.fields.getTextInputValue('ticker_input').toUpperCase();
      const tradeType = interaction.fields.getTextInputValue('tradetype_input').toLowerCase();
      const amountStr = interaction.fields.getTextInputValue('amount_input');
      const notes = interaction.fields.getTextInputValue('notes_input') || null;

      // Validate trade type
      if (!['profit', 'loss', 'breakeven'].includes(tradeType)) {
        await interaction.reply({
          content: '❌ That is not valid!. Use: profit, loss, or breakeven',
          ephemeral: false
        });
        return;
      }

      // Validate amount
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        await interaction.reply({
          content: '❌ Invalid amount. Type a valid number.',
          ephemeral: false
        });
        return;
      }

      // For breakeven, amount should be 0
      if (tradeType === 'breakeven' && amount !== 0) {
        await interaction.reply({
          content: '❌ Your trade went breakeven, its supposed to be 0$.',
          ephemeral: false
        });
        return;
      }

      // Insert trade journal entry
      await db.insert(tradeJournalEntries).values({
        userId: discordAccount[0].userId,
        ticker,
        tradeType,
        amount: amount.toString(),
        notes
      });

      // Get updated stats
      const stats = await calculateUserStats(discordAccount[0].userId);

      const embed = new EmbedBuilder()
        .setColor(tradeType === 'profit' ? 0x10b981 : tradeType === 'loss' ? 0xef4444 : 0x6b7280)
        .setTitle('Athenium Journal')
        .addFields(
          { name: 'Ticker', value: ticker, inline: true },
          { name: 'Stage', value: tradeType.toUpperCase(), inline: true },
          { name: 'Result', value: `$${amount}`, inline: true },
          { name: 'Trades done', value: stats.totalTrades.toString(), inline: true },
          { name: 'Winrate', value: `${stats.successRate}%`, inline: true },
          { name: 'Monthly P&L', value: `$${stats.monthlyPL}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Athenium Readback' });

      if (notes) {
        embed.addFields({ name: '📝 Notas', value: notes, inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    else if (interaction.customId.startsWith('embed_modal_')) {
      const channelId = interaction.customId.replace('embed_modal_', '');
      
      try {
        console.log(`📝 Processing embed for channel: ${channelId}`);
        
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          console.log(`❌ Channel ${channelId} not found or is not text-based`);
          await interaction.reply({
            content: '❌ Canal no encontrado o no es un canal de texto válido.',
            ephemeral: false
          });
          return;
        }

        console.log(`✅ Channel found: ${channel.name}`);

        // Check bot permissions in the channel
        const permissions = channel.permissionsFor(client.user);
        if (!permissions.has(PermissionFlagsBits.SendMessages)) {
          console.log(`❌ Bot doesn't have permission to send messages in ${channel.name}`);
          await interaction.reply({
            content: '❌ El bot no tiene permisos para enviar mensajes en ese canal. Por favor verifica los permisos.',
            ephemeral: false
          });
          return;
        }

        if (!permissions.has(PermissionFlagsBits.EmbedLinks)) {
          console.log(`❌ Bot doesn't have permission to embed links in ${channel.name}`);
          await interaction.reply({
            content: '❌ El bot no tiene permisos para enviar embeds en ese canal. Por favor verifica los permisos.',
            ephemeral: false
          });
          return;
        }

        // Get embed data from modal
        const title = interaction.fields.getTextInputValue('embed_title') || null;
        const description = interaction.fields.getTextInputValue('embed_description') || null;
        const colorInput = interaction.fields.getTextInputValue('embed_color') || null;
        const footer = interaction.fields.getTextInputValue('embed_footer') || null;
        const imageUrl = interaction.fields.getTextInputValue('embed_image') || null;

        // Validate that at least title or description is provided
        if (!title && !description) {
          await interaction.reply({
            content: '❌ Debes proporcionar al menos un título o una descripción para el embed.',
            ephemeral: false
          });
          return;
        }

        // Create embed
        const customEmbed = new EmbedBuilder();

        if (title) customEmbed.setTitle(title);
        if (description) customEmbed.setDescription(description);
        if (footer) customEmbed.setFooter({ text: footer });
        if (imageUrl) {
          try {
            customEmbed.setImage(imageUrl);
          } catch (error) {
            console.log('Invalid image URL provided');
          }
        }

        // Parse color
        let color = 0x1e40af; // Default blue
        if (colorInput) {
          try {
            if (colorInput.startsWith('#')) {
              color = parseInt(colorInput.slice(1), 16);
            } else if (colorInput.startsWith('0x')) {
              color = parseInt(colorInput.slice(2), 16);
            } else {
              color = parseInt(colorInput, 16);
            }
          } catch (error) {
            console.log('Invalid color format, using default');
          }
        }
        customEmbed.setColor(color);

        // Add timestamp
        customEmbed.setTimestamp();

        // Send embed to channel
        await channel.send({ embeds: [customEmbed] });
        console.log(`✅ Embed sent successfully to ${channel.name}`);

        await interaction.reply({
          content: `✅ Embed enviado exitosamente al canal <#${channelId}>`,
          ephemeral: false
        });

      } catch (error) {
        console.error('❌ Error creating embed:', error);
        console.error('Error stack:', error.stack);
        await interaction.reply({
          content: `❌ Error al crear o enviar el embed: ${error.message}\n\nVerifica que el bot tenga permisos de "Enviar Mensajes" y "Insertar Enlaces" en el canal.`,
          ephemeral: false
        });
      }
    }
  } catch (error) {
    console.error('Error handling modal submission:', error);
    try {
      await interaction.reply({
        content: '❌ Ocurrió un error al procesar la información.',
        ephemeral: false
      });
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
  return;
}

  // Handle slash commands
  const { commandName } = interaction;

  try {
    if (commandName === 'login') {
      // Create login modal
      const modal = new ModalBuilder()
        .setCustomId('login_modal')
        .setTitle('Link Athenium Account');

      const emailInput = new TextInputBuilder()
        .setCustomId('email_input')
        .setLabel('Email')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('your@mail.com')
        .setRequired(true);

      const passwordInput = new TextInputBuilder()
        .setCustomId('password_input')
        .setLabel('Password')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Your password')
        .setRequired(true);

      const emailRow = new ActionRowBuilder().addComponents(emailInput);
      const passwordRow = new ActionRowBuilder().addComponents(passwordInput);
      
      modal.addComponents(emailRow, passwordRow);

      await interaction.showModal(modal);
    }

    else if (commandName === 'data') {
      // Check if user is linked
      const discordAccount = await db.select()
        .from(discordAccounts)
        .where(eq(discordAccounts.discordId, interaction.user.id))
        .limit(1);

      if (discordAccount.length === 0) {
        await interaction.reply({
          content: '❌ Your account is not linked to us. Use /login to link your discord',
          ephemeral: false
        });
        return;
      }

      // Get user data
      const user = await db.select()
        .from(users)
        .where(eq(users.id, discordAccount[0].userId))
        .limit(1);

      if (user.length === 0) {
        await interaction.reply({
          content: '❌ Error: We couldn\'t find that username in our database.',
          ephemeral: false
        });
        return;
      }

      const userData = user[0];
      const stats = await calculateUserStats(userData.id);

      // Create embed with user data
      const embed = new EmbedBuilder()
        .setColor(0x1e40af)
        .setTitle('Athenium Account Information')
        .setDescription(`**Athenate User ID:** ${userData.uniqueId}`)
        .addFields(
          { name: 'Email', value: userData.email, inline: true },
          { name: 'Progress', value: `${userData.progress}%`, inline: true },
          { name: 'Level', value: userData.tradingLevel, inline: true },
          { name: 'Trades', value: stats.totalTrades.toString(), inline: true },
          { name: 'Winrate', value: `${stats.successRate}%`, inline: true },
          { name: 'Monthly P&L', value: `$${stats.monthlyPL}`, inline: true },
          { name: 'Ratio R/R', value: stats.riskRewardRatio.toString(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Athenium Readback' });

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    else if (commandName === 'journal') {
      // Check if user is linked
      const discordAccount = await db.select()
        .from(discordAccounts)
        .where(eq(discordAccounts.discordId, interaction.user.id))
        .limit(1);

      if (discordAccount.length === 0) {
        await interaction.reply({
          content: '❌ Your account is not linked with us. Use `/login` to link your account.',
          ephemeral: false
        });
        return;
      }

      // Create journal entry modal
      const modal = new ModalBuilder()
        .setCustomId('journal_modal')
        .setTitle('Athenium Journaling');

      const tickerInput = new TextInputBuilder()
        .setCustomId('ticker_input')
        .setLabel('Ticker/Symbol')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('NQ!1, XAUUSD, BTC, AAPL etc.')
        .setRequired(true);

      const tradeTypeInput = new TextInputBuilder()
        .setCustomId('tradetype_input')
        .setLabel('Trade stage')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Profit, Loss, or Breakeven')
        .setRequired(true);

      const amountInput = new TextInputBuilder()
        .setCustomId('amount_input')
        .setLabel('Amount (Win/Loss)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('100.50, -50.25, 0 (for breakeven)')
        .setRequired(true);

      const notesInput = new TextInputBuilder()
        .setCustomId('notes_input')
        .setLabel('Notes (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Notes for this trade made...')
        .setRequired(false);

      const tickerRow = new ActionRowBuilder().addComponents(tickerInput);
      const tradeTypeRow = new ActionRowBuilder().addComponents(tradeTypeInput);
      const amountRow = new ActionRowBuilder().addComponents(amountInput);
      const notesRow = new ActionRowBuilder().addComponents(notesInput);
      
      modal.addComponents(tickerRow, tradeTypeRow, amountRow, notesRow);

      await interaction.showModal(modal);
    }

    else if (commandName === 'help') {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x1e40af)
        .setTitle('Athenium Commands')
        .setDescription('Available to usage commands:')
        .addFields(
          { name: '🔗 /login', value: 'Link your discord account to athenium', inline: false },
          { name: '📊 /data', value: 'Show your account information & statistics', inline: false },
          { name: '📝 /journal', value: 'Journal your trades with us', inline: false },
          { name: '📈 /trades', value: 'Show all the trades uploaded in your journal', inline: false },
          { name: '❓ /help', value: 'Show the commands list', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'ATHENIUM Trading Platform' });

      await interaction.reply({ embeds: [helpEmbed], ephemeral: false });
    }

    else if (commandName === 'embed') {
      const channel = interaction.options.getChannel('canal');
      
      // Verify the channel is text-based
      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          content: '❌ Please mention a valid text channel.',
          ephemeral: false
        });
        return;
      }

      // Create embed modal
      const modal = new ModalBuilder()
        .setCustomId(`embed_modal_${channel.id}`)
        .setTitle('Crear Embed Personalizado');

      const titleInput = new TextInputBuilder()
        .setCustomId('embed_title')
        .setLabel('Título del Embed')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Título llamativo...')
        .setRequired(false)
        .setMaxLength(256);

      const descriptionInput = new TextInputBuilder()
        .setCustomId('embed_description')
        .setLabel('Descripción')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Contenido principal del mensaje...')
        .setRequired(false)
        .setMaxLength(4000);

      const colorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setLabel('Color (hex)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#1e40af o 0x1e40af')
        .setRequired(false);

      const footerInput = new TextInputBuilder()
        .setCustomId('embed_footer')
        .setLabel('Footer (pie de página)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Texto del footer...')
        .setRequired(false)
        .setMaxLength(2048);

      const imageInput = new TextInputBuilder()
        .setCustomId('embed_image')
        .setLabel('URL de Imagen (opcional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://ejemplo.com/imagen.jpg')
        .setRequired(false);

      const titleRow = new ActionRowBuilder().addComponents(titleInput);
      const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
      const colorRow = new ActionRowBuilder().addComponents(colorInput);
      const footerRow = new ActionRowBuilder().addComponents(footerInput);
      const imageRow = new ActionRowBuilder().addComponents(imageInput);
      
      modal.addComponents(titleRow, descriptionRow, colorRow, footerRow, imageRow);

      await interaction.showModal(modal);
    }

    else if (commandName === 'picture') {
      const channelId = interaction.options.getString('canal');
      const attachment = interaction.options.getAttachment('imagen');
      
      // Verify the channel exists and bot has access
      try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            content: '❌ Canal no encontrado o no es un canal de texto válido.',
            ephemeral: false
          });
          return;
        }

        // Verify attachment is an image
        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
          await interaction.reply({
            content: '❌ El archivo adjunto debe ser una imagen.',
            ephemeral: false
          });
          return;
        }

        // Send the image to the specified channel
        await channel.send({
          files: [{
            attachment: attachment.url,
            name: attachment.name
          }]
        });

        await interaction.reply({
          content: `✅ Imagen enviada exitosamente al canal <#${channelId}>`,
          ephemeral: false
        });

      } catch (error) {
        console.error('Error sending picture:', error);
        await interaction.reply({
          content: '❌ Error al enviar la imagen. Verifica permisos y que el canal sea válido.',
          ephemeral: false
        });
      }
    }

    else if (commandName === 'trades') {
      // Check if user is linked
      const discordAccount = await db.select()
        .from(discordAccounts)
        .where(eq(discordAccounts.discordId, interaction.user.id))
        .limit(1);
      
      if (discordAccount.length === 0) {
        await interaction.reply({
          content: '❌ Your discord account is not linked to us. Use `/login` to link your account first.',
          ephemeral: false
        });
        return;
      }

      try {
        // Get user's trades from database
        const userTrades = await db.select()
          .from(tradeJournalEntries)
          .where(eq(tradeJournalEntries.userId, discordAccount[0].userId))
          .orderBy(desc(tradeJournalEntries.entryDate));

        if (userTrades.length === 0) {
          await interaction.reply({
            content: '📈 You got no trades yet. Use `/journal` to upload your first trade.',
            ephemeral: false
          });
          return;
        }

        // Create embeds for trades (Discord has a 10 field limit per embed)
        const tradesPerEmbed = 8;
        const totalPages = Math.ceil(userTrades.length / tradesPerEmbed);
        
        const embeds = [];
        
        for (let page = 0; page < totalPages; page++) {
          const startIdx = page * tradesPerEmbed;
          const endIdx = Math.min(startIdx + tradesPerEmbed, userTrades.length);
          const pageTrades = userTrades.slice(startIdx, endIdx);
          
          const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle(`📈 Trade History ${totalPages > 1 ? `(Page ${page + 1}/${totalPages})` : ''}`)
            .setDescription(`Total Trades: ${userTrades.length}`)
            .setTimestamp()
            .setFooter({ text: 'ATHENIUM Trade Journal' });

          for (const trade of pageTrades) {
            const tradeDate = new Date(trade.entryDate).toLocaleDateString();
            const emoji = trade.tradeType === 'profit' ? '✅' : trade.tradeType === 'loss' ? '❌' : '⚪';
            const fieldValue = `**Type:** ${trade.tradeType.toUpperCase()}\n**Amount:** $${trade.amount}\n**Date:** ${tradeDate}${trade.notes ? `\n**Notes:** ${trade.notes}` : ''}`;
            
            embed.addFields({
              name: `${emoji} ${trade.ticker}`,
              value: fieldValue,
              inline: false
            });
          }

          embeds.push(embed);
        }

        // Send the first embed
        await interaction.reply({ embeds: [embeds[0]], ephemeral: false });

        // Send additional embeds if there are multiple pages
        for (let i = 1; i < embeds.length; i++) {
          await interaction.followUp({ embeds: [embeds[i]], ephemeral: false });
        }

      } catch (error) {
        console.error('Error fetching trades:', error);
        await interaction.reply({
          content: '❌ Error fetching your trades. Please try again later.',
          ephemeral: false
        });
      }
    }

    else if (commandName === 'ticketsend') {
      const channel = interaction.options.getChannel('channel');
      
      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          content: '❌ Please provide a valid text channel.',
          ephemeral: false
        });
        return;
      }

      // Create ticket button
      const ticketButton = new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('📩 Create Support Ticket')
        .setStyle(ButtonStyle.Primary);

      const buttonRow = new ActionRowBuilder().addComponents(ticketButton);

      // Create ticket system embed
      const ticketEmbed = new EmbedBuilder()
        .setColor(0x1e40af)
        .setTitle('🎫 ATHENIUM Support Tickets')
        .setDescription('Need help? Create a support ticket and our team will assist you.\n\n**How to create a ticket:**\n1. Click the button below\n2. Fill out the ticket form\n3. Wait for a team member to respond\n\n**Categories:**\n• Technical Support\n• Billing Questions\n• General Inquiries\n• Trading Help\n\n**Response Time:**\nWe aim to respond within 24 hours.')
        .setFooter({ text: 'ATHENIUM Support System' })
        .setTimestamp();

      await channel.send({
        embeds: [ticketEmbed],
        components: [buttonRow]
      });

      await interaction.reply({
        content: `✅ Ticket system message sent to ${channel}`,
        ephemeral: false
      });
    }

    else if (commandName === 'earlyaccess') {
      // Get optional parameters
      const title = interaction.options.getString('title') || '🚀 ATHENIUM Early Access';
      const description = interaction.options.getString('description') || 'Be among the first to experience ATHENIUM\'s revolutionary trading platform.\n\n**What you\'ll get:**\n• Priority access to all features\n• Exclusive early adopter benefits\n• Direct feedback channel with our team\n• Special pricing and offers\n\nClick the button below to sign up!';
      const colorInput = interaction.options.getString('color');
      const buttonText = interaction.options.getString('button_text') || '🎯 Sign Up for Early Access';

      // Parse color
      let color = 0x1e40af; // Default blue
      if (colorInput) {
        try {
          if (colorInput.startsWith('#')) {
            color = parseInt(colorInput.slice(1), 16);
          } else if (colorInput.startsWith('0x')) {
            color = parseInt(colorInput.slice(2), 16);
          } else {
            color = parseInt(colorInput, 16);
          }
        } catch (error) {
          console.log('Invalid color format, using default');
        }
      }

      // Create embed
      const earlyAccessEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: 'ATHENIUM Trading Platform' });

      // Create signup button
      const signupButton = new ButtonBuilder()
        .setCustomId('early_access_signup')
        .setLabel(buttonText)
        .setStyle(ButtonStyle.Success);

      const buttonRow = new ActionRowBuilder().addComponents(signupButton);

      await interaction.channel.send({
        embeds: [earlyAccessEmbed],
        components: [buttonRow]
      });

      await interaction.reply({
        content: '✅ Early access signup message sent!',
        ephemeral: false
      });
    }

    else if (commandName === 'checkea') {
      const signups = readSignups();

      if (signups.length === 0) {
        await interaction.reply({
          content: 'ℹ️ No early access signups yet.',
          ephemeral: false
        });
        return;
      }

      // Create embed with signups
      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('📊 Early Access Signups')
        .setDescription(`**Total Signups:** ${signups.length}`)
        .setTimestamp()
        .setFooter({ text: 'ATHENIUM Early Access' });

      // Add fields for each signup (limit to 25 fields per embed)
      const displaySignups = signups.slice(0, 25);
      for (const signup of displaySignups) {
        const date = new Date(signup.timestamp).toLocaleString();
        embed.addFields({
          name: `${signup.username}`,
          value: `**ID:** ${signup.userId}\n**Date:** ${date}`,
          inline: false
        });
      }

      if (signups.length > 25) {
        embed.setDescription(`**Total Signups:** ${signups.length}\n*Showing first 25 signups*`);
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
    }

    else if (commandName === 'rules') {
      const title = interaction.options.getString('title') || '📜 ATHENIUM Server Rules';
      const colorInput = interaction.options.getString('color');

      // Parse color
      let color = 0x1e40af; // Default blue
      if (colorInput) {
        try {
          if (colorInput.startsWith('#')) {
            color = parseInt(colorInput.slice(1), 16);
          } else if (colorInput.startsWith('0x')) {
            color = parseInt(colorInput.slice(2), 16);
          } else {
            color = parseInt(colorInput, 16);
          }
        } catch (error) {
          console.log('Invalid color format, using default');
        }
      }

      const rulesEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription('Please read and follow these rules to maintain a positive trading community.')
        .addFields(
          { name: '1️⃣ Respect Everyone', value: 'Treat all members with respect. No harassment, hate speech, or discriminatory behavior.', inline: false },
          { name: '2️⃣ No Spam or Self-Promotion', value: 'Avoid spamming messages, links, or excessive self-promotion without permission.', inline: false },
          { name: '3️⃣ Trading Discussion Only', value: 'Keep discussions relevant to trading, markets, and ATHENIUM platform features.', inline: false },
          { name: '4️⃣ No Financial Advice', value: 'Do not provide financial advice. Share analysis and opinions, but acknowledge they are not professional advice.', inline: false },
          { name: '5️⃣ Protect Privacy', value: 'Do not share personal information or private trading strategies without consent.', inline: false },
          { name: '6️⃣ Use Appropriate Channels', value: 'Post in the correct channels. Keep general chat separate from trading analysis.', inline: false },
          { name: '7️⃣ No Market Manipulation', value: 'Do not coordinate pump and dumps or engage in any form of market manipulation discussion.', inline: false },
          { name: '8️⃣ Report Issues', value: 'Report any rule violations or concerns to moderators immediately.', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'ATHENIUM Trading Community' });

      await interaction.channel.send({ embeds: [rulesEmbed] });

      await interaction.reply({
        content: '✅ Rules posted!',
        ephemeral: false
      });
    }

    else if (commandName === 'vision') {
      const title = interaction.options.getString('title') || '🎯 ATHENIUM Vision & Mission';
      const colorInput = interaction.options.getString('color');

      // Parse color
      let color = 0x1e40af; // Default blue
      if (colorInput) {
        try {
          if (colorInput.startsWith('#')) {
            color = parseInt(colorInput.slice(1), 16);
          } else if (colorInput.startsWith('0x')) {
            color = parseInt(colorInput.slice(2), 16);
          } else {
            color = parseInt(colorInput, 16);
          }
        } catch (error) {
          console.log('Invalid color format, using default');
        }
      }

      const visionEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription('**Our Vision**\n\nATHENIUM is built on the foundation of empowering real traders with real tools. We believe that successful trading comes from a combination of solid education, powerful analytics, and a supportive community.')
        .addFields(
          { 
            name: '🚀 Innovation in Trading', 
            value: 'We provide cutting-edge tools and instruments that give traders a competitive edge. Our platform integrates advanced analytics, real-time data feeds, and intelligent automation to enhance decision-making.', 
            inline: false 
          },
          { 
            name: '👥 Community-Driven Growth', 
            value: 'We foster a community of real traders helping real traders. Share insights, learn from experienced professionals, and grow together in a collaborative environment free from false promises and get-rich-quick schemes.', 
            inline: false 
          },
          { 
            name: '📚 Education & Development', 
            value: 'Continuous learning is at our core. We offer comprehensive educational resources, mentorship programs, and skill development opportunities to help traders at every level improve their craft.', 
            inline: false 
          },
          { 
            name: '🎯 Transparency & Trust', 
            value: 'We operate with complete transparency. Real trades, real results, real feedback. No hidden fees, no unrealistic promises—just honest tools and guidance for serious traders.', 
            inline: false 
          },
          { 
            name: '⚡ Advanced Tools & Features', 
            value: '• Real-time market data and news feeds\n• Advanced charting and technical analysis\n• Trade journaling and performance analytics\n• Risk management calculators\n• Automated trading strategies\n• Community insights and sentiment analysis', 
            inline: false 
          },
          { 
            name: '🌟 Our Commitment', 
            value: 'We are committed to building the most comprehensive trading ecosystem that supports traders from their first trade to becoming consistently profitable professionals. Your success is our mission.', 
            inline: false 
          }
        )
        .setTimestamp()
        .setFooter({ text: 'ATHENIUM - Empowering Real Traders' });

      await interaction.channel.send({ embeds: [visionEmbed] });

      await interaction.reply({
        content: '✅ Vision statement posted!',
        ephemeral: false
      });
    }

  } catch (error) {
    console.error('Error handling command:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your command.',
          ephemeral: false
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Login to Discord
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN environment variable is not set!');
  process.exit(1);
}

console.log('🔑 Discord token detected, attempting to connect...');
console.log('🔍 Token format check:', DISCORD_TOKEN.length > 0 ? `Token length: ${DISCORD_TOKEN.length} characters` : 'Token is empty');

client.login(DISCORD_TOKEN).catch(error => {
  console.error('❌ Failed to login to Discord:', error);
  console.log('🛠️ To solve this issue:');
  console.log('1. Verifica que el token sea correcto en https://discord.com/developers/applications');
  console.log('2. Asegúrate de que el bot esté habilitado en tu aplicación');
  console.log('3. Verifica que no haya espacios al inicio o final del token');
});

console.log('🚀 Starting Discord bot...');
