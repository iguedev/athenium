// Create custom eases and register GSAP plugins
CustomEase.create("smoothIn", "0.4, 0, 0.2, 1");
CustomEase.create("smoothOut", "0.8, 0, 0.6, 1");
CustomEase.create("textReveal", "0.25, 1, 0.5, 1");
gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText);

// Initialize variables
let lenis = null;
let splitTextInstances = [];
let isWebEntered = false;
let activeIndex = 0;
let isAnimating = false;

// DOM elements
const body = document.body;
const mainContent = document.querySelector("main");
const expandingImage = document.getElementById("expandingImage");
const enterButton = document.getElementById("enterButton");
const switchContainer = document.getElementById("switchContainer");
const scrollText = document.getElementById("scrollText");
const contentSection = document.getElementById("contentSection");
const heroSection = document.querySelector(".hero-section");
const slideTitle = document.getElementById("slideTitle");
const contentParagraph = document.getElementById("content-paragraph");
const slideCaption = document.getElementById("slideCaption");
const slideCategory = document.getElementById("slideCategory");
const grid = document.querySelector(".columns");
const columnsInner = {
  up: grid.querySelectorAll(".column-moveup > .column-inner"),
  down: grid.querySelectorAll(".column-movedown > .column-inner")
};
const content = document.querySelector(".content");
const thumbnails = document.querySelector(".thumbnails");
const thumbnailItems = thumbnails.querySelectorAll(".thumbnail");
const mouseIndicator = document.getElementById("mouseIndicator");
const brandName = document.querySelector(".brand-name");
const switchSubtitle = document.querySelector(".switch-subtitle");

// Lock scrolling initially
document.body.style.overflow = "hidden";

// Image and content data
const imageUrls = [
  "attached_assets/imagen1_1758942267968.jpg",
  "attached_assets/imagen2_1758942267968.JPG",
  "attached_assets/imagen3_1758942267968.JPG",
  "attached_assets/imagen4_1758942267968.JPG",
  "attached_assets/imagen5_1758942267969.JPG",
  "attached_assets/imagen6_1758942267969.JPG",
  "attached_assets/imagen7_1758942267969.JPG"
];

const slideTitles = [
  { first: "Be", second: "Consistent" },
  { first: "Be", second: "Profitable" },
  { first: "Be", second: "Disciplined" },
  { first: "Empty", second: "Space" },
  { first: "Surface", second: "Depth" },
  { first: "Visible", second: "Unseen" },
  { first: "Moment", second: "Echo" }
];

const slideCaptions = [
  "01 / CONSISTENCY",
  "02 / DISCIPLINE",
  "03 / PROFITABILITY",
  "04 / ESSENCE",
  "05 / TEXTURE",
  "06 / PATTERN",
  "07 / AWARENESS"
];

const slideCategories = [
  "BY REAL TRADERS",
  "BY REAL TRADERS",
  "BY REAL TRADERS",
  "BY REAL TRADERS",
  "SENSATION",
  "OBSERVATION",
  "PRACTICE"
];

const slideContent = [
  "The space between what we want and what we have is what we do. Being consistent, means reaching the sky slowly. In silence, no one has to know. Because what people gets told is what people get ruined, keep it to yourself.",
  "There is only this moment. The past and future are constructs. These images exist in an eternal now, suspended between breaths. When we truly see, time dissolves and we become present with what is.",
  "We are both the observer and the observed. The shadow self contains what we hide, even from ourselves. These images reveal the dance between what we show and what we conceal. The silhouette speaks louder than the portrait.",
  "Emptiness is not nothing. It is the canvas upon which everything appears. These spaces between forms hold the potential for  It is the canvas upon which everything appears. These spaces between forms hold the potential for all creation. The negative space defines the subject more than the subject itself.",
  "The world speaks through texture. Rough against smooth. Soft against hard. These tactile qualities connect us to the physical realm. The eye can feel what the hand cannot touch. Sensation transcends the visual.",
  "Chaos contains order. Order contains chaos. The city, like nature, follows invisible patterns. These rhythms and repetitions reveal themselves when we step back and observe without judgment or expectation.",
  "Photography is not about capturing. It's about becoming aware. These images don't freeze moments; they extend them into eternity. The camera is not a tool but a practice of seeing what others miss."
];

// Initialize main content directly
function initializeMainContent() {
  // Show main content immediately
  gsap.set(mainContent, {
    opacity: 1,
    visibility: "visible"
  });

  gsap.timeline().set(grid, { opacity: 1 }).fromTo(
    ".column",
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      y: 0,
      stagger: 0.08,
      duration: 0.6,
      ease: "power2.out"
    }
  );

  // Show brand name and subtitle
  gsap.to([brandName, switchSubtitle], {
    opacity: 1,
    duration: 0.8,
    delay: 0.3,
    ease: "power2.out"
  });
  
  // Auto-execute ATHENIUM button after 2 seconds
  setTimeout(() => {
    console.log("Auto-executing ATHENIUM button after 2 seconds...");
    enterTheWeb();
  }, 2000);
}

// Text animation function using GSAP SplitText
function animateText(element, delay = 0, staggered = false) {
  gsap.set(element, { opacity: 1 });

  // Clean up previous split instances
  splitTextInstances = splitTextInstances.filter((instance) => {
    if (instance.target === element) {
      instance.revert();
      return false;
    }
    return true;
  });

  // Create new SplitText instance - using chars instead of lines for better control
  const splitText = new SplitText(element, {
    type: "words,chars",
    charsClass: "char",
    wordsClass: "word"
  });

  splitTextInstances.push(splitText);

  // Create animation timeline
  const tl = gsap.timeline();

  // Animate based on whether it's staggered or not
  if (staggered && element.children.length > 1) {
    // First line (first child)
    tl.from(element.children[0].querySelectorAll(".char"), {
      duration: 0.9,
      yPercent: 100,
      opacity: 0.2,
      stagger: 0.03,
      ease: "textReveal",
      delay: delay
    });

    // Second line (second child) with delay
    tl.from(
      element.children[1].querySelectorAll(".char"),
      {
        duration: 0.9,
        yPercent: 100,
        opacity: 0.2,
        stagger: 0.03,
        ease: "textReveal"
      },
      "-=0.5"
    );
  } else {
    // Regular animation for all chars
    tl.from(splitText.chars, {
      duration: 0.9,
      yPercent: 100,
      opacity: 0.2,
      stagger: 0.02,
      ease: "textReveal",
      delay: delay
    });
  }

  return tl;
}

// Update slide content with animation
function updateSlideContent(index) {
  // Clean up previous SplitText instances
  splitTextInstances.forEach((instance) => {
    if (instance.revert) instance.revert();
  });
  splitTextInstances = [];

  // Update content
  const title = slideTitles[index];
  slideTitle.innerHTML = `
    <span class="content-title">${title.first}</span>
    <span class="content-title">${title.second}</span>
  `;

  contentParagraph.textContent = slideContent[index];
  slideCaption.textContent = slideCaptions[index];
  slideCategory.textContent = slideCategories[index];

  // Create animation timeline
  const masterTl = gsap.timeline();

  // Animate elements
  masterTl.fromTo(
    [slideCaption, slideCategory],
    { opacity: 0, y: -20 },
    { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" },
    0
  );

  const titleTl = animateText(slideTitle, 0.05, true);
  const paragraphTl = animateText(contentParagraph, 0.4);

  masterTl.add(titleTl, 0);
  masterTl.add(paragraphTl, 0);

  return masterTl;
}

// Find leftmost visible image
function findLeftmostVisibleImage() {
  const images = document.querySelectorAll(".column-item-img");
  let leftmostImage = null;
  let leftmostX = Infinity;

  images.forEach((img) => {
    const rect = img.getBoundingClientRect();
    if (
      rect.left < window.innerWidth &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.bottom > 0
    ) {
      if (rect.left < leftmostX) {
        leftmostX = rect.left;
        leftmostImage = img;
      }
    }
  });
  return leftmostImage;
}

// Initialize Lenis smooth scrolling
function initializeLenis() {
  if (!lenis) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: "vertical",
      gestureDirection: "vertical",
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }
}

// Enter the web animation
const enterTheWeb = () => {
  if (isAnimating || isWebEntered) return;
  isAnimating = true;

  switchContainer.style.paddingLeft = "30px";

  gsap.to([switchContainer, switchSubtitle], {
    opacity: 0,
    y: 20,
    duration: 0.3,
    ease: "power2.in",
    onComplete: () => {
      switchContainer.style.display = "none";
      switchSubtitle.style.display = "none";
    }
  });

  content.classList.add("content--current");

  const tl = gsap.timeline({
    onComplete: () => {
      isAnimating = false;
      isWebEntered = true;

      gsap.set(
        [
          ".expanding-image",
          ".content",
          ".content-paragraph",
          ".thumbnails",
          ".mouse-indicator",
          ".scroll-text",
          ".slide-caption",
          ".slide-category"
        ],
        { position: "absolute" }
      );

      initializeLenis();
      document.body.style.overflow = "auto";

      gsap.to([scrollText, mouseIndicator], {
        opacity: 1,
        duration: 0.5,
        delay: 0.5
      });

      ScrollTrigger.create({
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          // Detect mobile viewport
          const isMobile = window.innerWidth <= 768;
          const baseHeight = 100;
          
          gsap.to(".hero-section", {
            height: baseHeight - self.progress * 40 + "vh",
            duration: 0,
            width: "100%",
            transformOrigin: "center top"
          });

          gsap.to(".expanding-image", {
            scale: 1 + self.progress * 0.1,
            y: -self.progress * 25 + "%",
            duration: 0,
            width: "100vw",
            height: baseHeight + self.progress * 30 + "vh"
          });

          const contentWrapper = document.querySelector(".content");
          gsap.to(contentWrapper, {
            y: -self.progress * 50 + "%",
            opacity: 1 - self.progress * 0.7,
            duration: 0
          });

          gsap.to(".content-paragraph", {
            y: -self.progress * 50 + "%",
            opacity: 1 - self.progress * 0.7,
            duration: 0
          });

          gsap.to([".slide-caption", ".slide-category"], {
            y: -self.progress * 50 + "%",
            opacity: 1 - self.progress * 0.7,
            duration: 0
          });

          gsap.to(".thumbnails", {
            y: -self.progress * 50 + "%",
            opacity: 1 - self.progress * 0.7,
            duration: 0
          });

          gsap.to(".scroll-text", {
            opacity: 1 - self.progress * 2,
            y: -self.progress * 20 + "%",
            duration: 0
          });
        }
      });
    }
  });

  // Step 1: Zoom grid
  tl.to(grid, { scale: 1, duration: 0.8, ease: "power2.inOut" }, 0);

  tl.to(
    columnsInner.up,
    { y: "-200vh", duration: 0.8, ease: "power2.inOut" },
    0
  );
  tl.to(
    columnsInner.down,
    { y: "200vh", duration: 0.8, ease: "power2.inOut" },
    0
  );

  // Step 2: Set up expanding image
  tl.add(() => {
    const leftImg = findLeftmostVisibleImage();
    if (leftImg) {
      const imgRect = leftImg.getBoundingClientRect();
      const imgStyle = window.getComputedStyle(leftImg);
      const bgImage = imgStyle.backgroundImage;

      expandingImage.style.backgroundImage = bgImage;
      expandingImage.style.top = `${imgRect.top}px`;
      expandingImage.style.left = `${imgRect.left}px`;
      expandingImage.style.width = `${imgRect.width}px`;
      expandingImage.style.height = `${imgRect.height}px`;
      expandingImage.style.opacity = 1;

      activeIndex = parseInt(leftImg.getAttribute("data-index"));

      // Safely remove current active thumbnail
      const current = document.querySelector(".thumbnail.active");
      if (current) current.classList.remove("active");
      
      // Try to set new active thumbnail, fallback to first available if not found
      const target = document.querySelector(`.thumbnail[data-index="${activeIndex}"]`);
      if (target) {
        target.classList.add("active");
      } else {
        // Fallback: align UI and content to first visible thumbnail
        activeIndex = 0;
        const fallback = document.querySelector('.thumbnail[data-index="0"]');
        if (fallback) fallback.classList.add("active");
        expandingImage.style.backgroundImage = `url(${imageUrls[activeIndex]})`;
      }
    }
  }, 0.8);

  // Step 3: Expand image
  tl.to(
    expandingImage,
    { width: "100vw", duration: 0.7, ease: "power2.inOut" },
    1.0
  );
  tl.to(grid, { opacity: 0, duration: 0.3 }, 1.2);

  // Step 4: Show content
  tl.add(() => updateSlideContent(activeIndex), 1.8);
  tl.set(thumbnails, { opacity: 1 }, 2.2);
  tl.to(
    thumbnailItems,
    { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" },
    2.3
  );
};

// Handle thumbnail clicks
thumbnailItems.forEach((thumb, index) => {
  thumb.addEventListener("click", () => {
    if (!isWebEntered || isAnimating) return;

    const currentActive = document.querySelector(".thumbnail.active");
    if (currentActive) currentActive.classList.remove("active");
    thumb.classList.add("active");

    activeIndex = index;

    gsap.to(expandingImage, {
      opacity: 0.5,
      duration: 0.3,
      onComplete: () => {
        expandingImage.style.backgroundImage = `url(${imageUrls[index]})`;
        gsap.to(expandingImage, { opacity: 1, duration: 0.3 });
      }
    });

    gsap.set([slideCaption, slideCategory], { opacity: 0, y: -20 });
    updateSlideContent(index);
  });
});

// Enter button hover effects
enterButton.addEventListener("mouseenter", () => {
  enterButton.querySelector(".indicator-dot").style.opacity = "1";
  switchContainer.style.paddingLeft = "30px";
});

enterButton.addEventListener("mouseleave", () => {
  enterButton.querySelector(".indicator-dot").style.opacity = "0";
  switchContainer.style.paddingLeft = "20px";
});

// Enter button click
enterButton.addEventListener("click", enterTheWeb);

// Removed auto-execute - now user must manually click the button

// Scroll event handler
window.addEventListener("scroll", () => {
  if (isWebEntered) {
    const scrollY = window.scrollY;
    if (scrollY > 100) {
      gsap.to(scrollText, { opacity: 0, duration: 0.3 });
    } else {
      gsap.to(scrollText, { opacity: 1, duration: 0.3 });
    }
  }
});

// Trading Section Animations
function initTradingAnimations() {
  // Animate stats numbers
  gsap.utils.toArray(".stat-number").forEach((stat) => {
    const endValue = stat.textContent;
    gsap.fromTo(stat, 
      { textContent: 0 },
      {
        textContent: endValue,
        duration: 2,
        ease: "power2.out",
        snap: { textContent: 1 },
        scrollTrigger: {
          trigger: stat,
          start: "top 80%",
          once: true
        }
      }
    );
  });

  // Animate service cards
  gsap.fromTo(".service-card", 
    { 
      opacity: 0, 
      y: 50,
      scale: 0.9 
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.2,
      scrollTrigger: {
        trigger: ".services-grid",
        start: "top 80%",
        once: true
      }
    }
  );

  // Animate testimonials
  gsap.fromTo(".testimonial-card", 
    { 
      opacity: 0, 
      x: -30 
    },
    {
      opacity: 1,
      x: 0,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.15,
      scrollTrigger: {
        trigger: ".testimonials-grid",
        start: "top 80%",
        once: true
      }
    }
  );

  // Animate trading hero
  gsap.fromTo(".trading-title", 
    { 
      opacity: 0, 
      y: 30 
    },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".trading-hero",
        start: "top 80%",
        once: true
      }
    }
  );

  gsap.fromTo(".trading-subtitle", 
    { 
      opacity: 0, 
      y: 20 
    },
    {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power2.out",
      delay: 0.3,
      scrollTrigger: {
        trigger: ".trading-hero",
        start: "top 80%",
        once: true
      }
    }
  );
}

// Trading Button Interactions
function initTradingButton() {
  const joinButton = document.getElementById("joinButton");
  const indicator = joinButton.querySelector(".cta-indicator");

  joinButton.addEventListener("mouseenter", () => {
    indicator.style.opacity = "1";
    gsap.to(joinButton, {
      scale: 1.05,
      duration: 0.3,
      ease: "power2.out"
    });
  });

  joinButton.addEventListener("mouseleave", () => {
    indicator.style.opacity = "0";
    gsap.to(joinButton, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out"
    });
  });

  joinButton.addEventListener("click", () => {
    // Animate button press
    gsap.to(joinButton, {
      scale: 0.95,
      duration: 0.1,
      ease: "power2.out",
      yoyo: true,
      repeat: 1
    });

    // Redirect to auth page
    console.log("¡Redirigiendo a la página de autenticación!");
    window.location.href = '/auth';
  });
}

// Initialize trading hero button
function initTradingHeroButton() {
  const tradingJoinButton = document.getElementById("tradingJoinButton");
  const indicator = tradingJoinButton.querySelector(".trading-cta-indicator");

  tradingJoinButton.addEventListener("mouseenter", () => {
    indicator.style.opacity = "1";
    gsap.to(tradingJoinButton, {
      scale: 1.05,
      duration: 0.3,
      ease: "power2.out"
    });
  });

  tradingJoinButton.addEventListener("mouseleave", () => {
    indicator.style.opacity = "0";
    gsap.to(tradingJoinButton, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out"
    });
  });

  tradingJoinButton.addEventListener("click", () => {
    console.log("Trading join button clicked!");
    window.location.href = '/auth';
  });
}

// Initialize all trading animations when content section is visible
function initTradingSection() {
  ScrollTrigger.create({
    trigger: ".content-section",
    start: "top 90%",
    once: true,
    onEnter: () => {
      initTradingAnimations();
      initTradingButton();
      initTradingHeroButton();
    }
  });
}

// Initialize content when page is loaded
window.addEventListener("load", () => {
  initializeMainContent();
  
  // Initialize trading section after a small delay
  setTimeout(() => {
    initTradingSection();
  }, 1000);
});