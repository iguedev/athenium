# ATHENIUM Trading Platform Design Guidelines

## Design Approach
**Selected Approach**: Hybrid approach combining Financial Industry Standards with Material Design System principles, inspired by leading trading platforms like TradingView, Interactive Brokers, and modern fintech applications.

**Key Design Principles**:
- Professional credibility and institutional trust
- Information hierarchy for complex financial data
- Accessibility for extended trading sessions
- Scalable interface for multiple user roles

## Core Design Elements

### Color Palette
**Primary Colors**:
- Deep Navy: 220 45% 15% (main brand, headers, primary actions)
- Financial Blue: 210 55% 25% (secondary elements, data containers)
- Slate Gray: 215 20% 35% (neutral backgrounds, borders)

**Accent Colors**:
- Success Green: 145 65% 35% (gains, positive indicators)
- Alert Red: 350 75% 45% (losses, critical alerts)
- Warning Amber: 35 85% 55% (caution states, pending actions)

**Dark Mode Palette**:
- Background: 220 25% 8%
- Surface: 220 20% 12%
- Text Primary: 0 0% 95%
- Text Secondary: 0 0% 75%

### Typography
**Primary Font**: Inter (Google Fonts) - excellent readability for financial data
**Accent Font**: JetBrains Mono (for numbers, codes, and data tables)

**Hierarchy**:
- Headlines: Inter 600, 32px-24px
- Subheadings: Inter 500, 20px-16px
- Body: Inter 400, 16px-14px
- Data/Numbers: JetBrains Mono 500, 14px-16px

### Layout System
**Tailwind Spacing Units**: Consistent use of 2, 4, 6, 8, 12, 16 units
- Micro spacing: p-2, m-2 (8px)
- Standard spacing: p-4, m-4 (16px)
- Section spacing: p-8, m-8 (32px)
- Large spacing: p-12, m-12 (48px)

## Component Library

### Navigation
- **Admin Sidebar**: Fixed left navigation with collapsible sections (Usuarios, Mentorías, Análisis, Configuración)
- **User Dashboard**: Top navigation bar with account balance, notifications, and profile dropdown
- **Breadcrumbs**: Consistent navigation path display

### Data Displays
- **Trading Cards**: Clean cards with subtle shadows for market data, portfolio positions
- **Data Tables**: Sortable tables with alternating row colors, hover states
- **Charts Integration**: TradingView-style chart containers with dark themes
- **Metrics Dashboard**: KPI cards with large numbers and trend indicators

### Forms & Controls
- **Trading Forms**: Buy/sell order forms with clear validation states
- **Filter Controls**: Advanced filtering for trade history, mentorship sessions
- **Search Components**: Real-time search for instruments, mentors, students

### Status Indicators
- **Trading Status**: Live market indicators (open/closed)
- **Mentorship Status**: Available/busy/offline states for mentors
- **Order Status**: Clear visual states for pending, executed, cancelled orders

## Platform-Specific Sections

### Admin Dashboard
- **Overview Grid**: 3-column layout with key metrics, recent activity, system alerts
- **User Management**: Searchable user list with role badges and quick actions
- **Mentorship Analytics**: Performance metrics, session statistics, revenue tracking

### User Trading Interface
- **Portfolio Overview**: Asset allocation charts, P&L summary, recent positions
- **Market Data**: Real-time price feeds, watchlists, market news integration
- **Order Management**: Quick trade forms, order history, position management

### Mentorship System
- **Mentor Profiles**: Photo, rating, specialties, availability calendar
- **Session Interface**: Video call integration, shared screen capabilities, note-taking
- **Progress Tracking**: Student progress charts, learning milestones, performance analytics

## Visual Treatments
**Gradients**: Subtle gradients from deep navy to slate for hero sections and card headers
**Shadows**: Minimal drop shadows (0 2px 8px rgba(0,0,0,0.1)) for card elevation
**Borders**: 1px borders in slate gray for clean separation
**Icons**: Heroicons for UI elements, custom financial icons for trading actions

## Images
**Hero Image**: Large hero image on marketing landing page showing professional traders in modern office environment or abstract financial data visualization
**Dashboard Assets**: Small profile photos, company logos, chart thumbnails
**Mentorship Section**: Professional headshots of mentors, certification badges
**Background Elements**: Subtle financial pattern overlays, geometric shapes for visual interest

This design framework ensures ATHENIUM conveys institutional-grade professionalism while maintaining usability across complex trading workflows and mentorship interactions.