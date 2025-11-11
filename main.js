// ===== INTELLIGENT AUTOMATION PORTFOLIO - MAIN.JS =====

// Console startup message
console.log('🚀 System Online — Intelligent Automation Portfolio Loaded');

// ===== CONFIGURATION =====
const CONFIG = {
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  animationSpeed: 2000, // Pipeline animation duration in ms
  intersectionThreshold: 0.3,
  smoothScrollOffset: 80, // Offset for sticky header
};

// ===== UTILITY FUNCTIONS =====
const Utils = {
  // Debounce function for performance
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Check if element is in viewport
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  },

  // Get section ID from href
  getSectionId(href) {
    return href.startsWith('#') ? href.substring(1) : null;
  }
};

// ===== NAVIGATION ACTIVE STATE =====
class NavigationController {
  constructor() {
    this.navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
    this.sections = Array.from(this.navLinks).map(link => {
      const id = Utils.getSectionId(link.getAttribute('href'));
      return document.getElementById(id);
    }).filter(Boolean);
    
    this.currentActive = null;
    this.init();
  }

  init() {
    if (this.sections.length === 0) return;

    // Create intersection observer
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        threshold: CONFIG.intersectionThreshold,
        rootMargin: `-${CONFIG.smoothScrollOffset}px 0px -60% 0px`
      }
    );

    // Observe all sections
    this.sections.forEach(section => this.observer.observe(section));
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.setActiveNavLink(entry.target.id);
      }
    });
  }

  setActiveNavLink(sectionId) {
    // Remove current active state
    if (this.currentActive) {
      this.currentActive.classList.remove('active');
    }

    // Find and set new active link
    const activeLink = Array.from(this.navLinks).find(link => 
      Utils.getSectionId(link.getAttribute('href')) === sectionId
    );

    if (activeLink) {
      activeLink.classList.add('active');
      this.currentActive = activeLink;
    }
  }
}

// ===== SMOOTH SCROLL =====
class SmoothScrollController {
  constructor() {
    this.init();
  }

  init() {
    // Handle all internal anchor links
    document.addEventListener('click', this.handleClick.bind(this));
  }

  handleClick(e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = Utils.getSectionId(link.getAttribute('href'));
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      e.preventDefault();
      this.scrollToElement(targetElement);
    }
  }

  scrollToElement(element) {
    const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementTop - CONFIG.smoothScrollOffset;

    if (CONFIG.reducedMotion) {
      window.scrollTo(0, offsetPosition);
    } else {
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
}

// ===== HERO PIPELINE ANIMATION =====
class PipelineAnimation {
  constructor() {
    this.pipelineSvg = document.querySelector('.pipeline-svg');
    this.stations = [];
    this.capsules = [];
    this.animationId = null;
    this.isPaused = CONFIG.reducedMotion;
    
    this.init();
  }

  init() {
    if (!this.pipelineSvg) return;

    this.createStations();
    this.createCapsules();
    this.setupKeyboardNavigation();
    
    if (!this.isPaused) {
      this.startAnimation();
    }
  }

  createStations() {
    const stationData = [
      { cx: 60, cy: 60, title: 'Data Ingest', metric: 'Latency -15%' },
      { cx: 160, cy: 60, title: 'Real-time Process', metric: 'Throughput +40%' },
      { cx: 260, cy: 60, title: 'AI Optimize', metric: 'Efficiency +23%' },
      { cx: 360, cy: 60, title: 'Smart Deliver', metric: 'Accuracy 99.7%' }
    ];

    stationData.forEach((data, index) => {
      const circle = this.pipelineSvg.querySelector(`circle:nth-of-type(${index + 1})`);
      if (circle) {
        // Make interactive
        circle.setAttribute('tabindex', '0');
        circle.setAttribute('role', 'button');
        circle.setAttribute('aria-label', `${data.title}: ${data.metric}`);
        
        // Store station data
        circle.stationData = data;
        this.stations.push(circle);

        // Add hover effects
        circle.addEventListener('mouseenter', () => this.showTooltip(circle, data));
        circle.addEventListener('mouseleave', () => this.hideTooltip());
        circle.addEventListener('focus', () => this.showTooltip(circle, data));
        circle.addEventListener('blur', () => this.hideTooltip());
      }
    });
  }

  createCapsules() {
    if (this.isPaused) return;

    // Create animated capsules
    for (let i = 0; i < 3; i++) {
      const capsule = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      capsule.setAttribute('r', '3');
      capsule.setAttribute('fill', '#2D8CFF');
      capsule.setAttribute('opacity', '0.8');
      capsule.setAttribute('cy', '60');
      capsule.setAttribute('cx', '30'); // Start position
      
      // Add glow effect
      capsule.style.filter = 'drop-shadow(0 0 4px #2D8CFF)';
      
      this.pipelineSvg.appendChild(capsule);
      this.capsules.push({
        element: capsule,
        position: 30 - (i * 40), // Stagger starting positions
        speed: 0.5 + (Math.random() * 0.3) // Vary speed slightly
      });
    }
  }

  showTooltip(station, data) {
    this.hideTooltip(); // Remove existing tooltip

    const tooltip = document.createElement('div');
    tooltip.className = 'pipeline-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-title">${data.title}</div>
      <div class="tooltip-metric">${data.metric}</div>
    `;

    document.body.appendChild(tooltip);

    // Position tooltip
    const stationRect = station.getBoundingClientRect();
    const svgRect = this.pipelineSvg.getBoundingClientRect();
    
    tooltip.style.position = 'absolute';
    tooltip.style.left = `${stationRect.left + stationRect.width / 2}px`;
    tooltip.style.top = `${stationRect.top - 10}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';
    tooltip.style.zIndex = '1000';

    this.currentTooltip = tooltip;

    // Add glow effect to station
    station.style.filter = 'drop-shadow(0 0 8px #2D8CFF)';
  }

  hideTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }

    // Remove glow from all stations
    this.stations.forEach(station => {
      station.style.filter = '';
    });
  }

  setupKeyboardNavigation() {
    this.stations.forEach((station, index) => {
      station.addEventListener('keydown', (e) => {
        let newIndex = index;
        
        switch(e.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            newIndex = (index + 1) % this.stations.length;
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            newIndex = (index - 1 + this.stations.length) % this.stations.length;
            break;
          case 'Home':
            newIndex = 0;
            break;
          case 'End':
            newIndex = this.stations.length - 1;
            break;
          default:
            return;
        }
        
        e.preventDefault();
        this.stations[newIndex].focus();
      });
    });
  }

  startAnimation() {
    if (this.isPaused) return;

    const animate = () => {
      this.capsules.forEach(capsule => {
        capsule.position += capsule.speed;
        
        // Reset position when capsule reaches the end
        if (capsule.position > 390) {
          capsule.position = 30;
        }
        
        capsule.element.setAttribute('cx', capsule.position);
      });

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// ===== SCROLL FADE-IN ANIMATIONS =====
class ScrollAnimationController {
  constructor() {
    this.animatedElements = document.querySelectorAll('section');
    this.init();
  }

  init() {
    if (CONFIG.reducedMotion) {
      // Add is-visible class immediately if motion is reduced
      this.animatedElements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    // Create intersection observer for fade-in animations
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    this.animatedElements.forEach(el => this.observer.observe(el));
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Stop observing once animated
        this.observer.unobserve(entry.target);
      }
    });
  }
}

// ===== THEME TOGGLE (Optional Enhancement) =====
class ThemeController {
  constructor() {
    this.currentTheme = this.getPreferredTheme();
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.createToggleButton();
    this.watchSystemPreferences();
  }

  getPreferredTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  createToggleButton() {
    const header = document.querySelector('header .header-container');
    if (!header) return;

    const toggleButton = document.createElement('button');
    toggleButton.className = 'theme-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle theme');
    toggleButton.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
    
    toggleButton.addEventListener('click', () => this.toggleTheme());
    
    header.appendChild(toggleButton);
    this.toggleButton = toggleButton;
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (this.toggleButton) {
      this.toggleButton.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  watchSystemPreferences() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
      }
    });
  }
}

// ===== CSS FOR DYNAMIC ELEMENTS =====
const DynamicStyles = {
  inject() {
    const styles = `
      /* Navigation active state */
      .main-nav a.active {
        color: var(--accent) !important;
        background: var(--glass-bg);
      }
      
      .main-nav a.active::after {
        width: 80% !important;
      }

      /* Pipeline tooltip */
      .pipeline-tooltip {
        background: var(--card-bg);
        border: 1px solid var(--accent);
        border-radius: 8px;
        padding: 0.5rem 1rem;
        backdrop-filter: blur(12px);
        pointer-events: none;
        animation: fadeInTooltip 0.2s ease;
      }

      .tooltip-title {
        color: var(--fg);
        font-weight: 600;
        font-size: 0.9rem;
      }

      .tooltip-metric {
        color: var(--accent);
        font-size: 0.8rem;
        margin-top: 0.2rem;
      }

      @keyframes fadeInTooltip {
        from {
          opacity: 0;
          transform: translate(-50%, -100%) translateY(10px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -100%) translateY(0);
        }
      }

      /* Section fade-in animations */
      section {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      section.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      /* Theme toggle button */
      .theme-toggle {
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1.2rem;
        backdrop-filter: blur(12px);
      }

      .theme-toggle:hover {
        border-color: var(--accent);
        box-shadow: 0 0 12px var(--accent);
      }

      /* Light theme variables */
      [data-theme="light"] {
        --bg: #ffffff;
        --fg: #24292e;
        --muted: #586069;
        --card-bg: rgba(0, 0, 0, 0.02);
        --card-border: rgba(0, 0, 0, 0.08);
        --glass-bg: rgba(0, 0, 0, 0.05);
        --grid-line: rgba(0, 0, 0, 0.03);
      }

      /* Reduced motion overrides */
      @media (prefers-reduced-motion: reduce) {
        section {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }

        .pipeline-tooltip {
          animation: none !important;
        }

        .main-nav a::after {
          transition: none !important;
        }
      }

      /* Pipeline station focus styles */
      .pipeline-svg circle:focus {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
};

// ===== INITIALIZATION =====
class PortfolioApp {
  constructor() {
    this.controllers = {};
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    // Inject dynamic styles
    DynamicStyles.inject();

    // Initialize all controllers
    this.controllers.navigation = new NavigationController();
    this.controllers.smoothScroll = new SmoothScrollController();
    this.controllers.pipeline = new PipelineAnimation();
    this.controllers.scrollAnimation = new ScrollAnimationController();
    this.controllers.theme = new ThemeController();

    // Handle reduced motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      CONFIG.reducedMotion = e.matches;
      
      if (e.matches) {
        this.controllers.pipeline.stopAnimation();
      } else {
        this.controllers.pipeline.startAnimation();
      }
    });

    // Performance monitoring
    this.logPerformance();
  }

  logPerformance() {
    if (window.performance && window.performance.timing) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      console.log(`⚡ Portfolio loaded in ${loadTime}ms`);
    }
  }
}

// ===== START APPLICATION =====
const portfolio = new PortfolioApp();