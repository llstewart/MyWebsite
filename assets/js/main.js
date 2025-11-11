// Terminal Portfolio JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all systems
    initMatrixEffect();
    initBootSequence();
    initNavigationSystem();
    initScrollEffects();
    initTypingAnimation();
    initInteractiveElements();
    initMobileOptimizations();
});

// Matrix Rain Effect
function initMatrixEffect() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Matrix characters
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const charArray = chars.split('');
    
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = [];
    
    // Initialize drops
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * canvas.height;
    }
    
    function drawMatrix() {
        // Semi-transparent black background for trailing effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Green text
        ctx.fillStyle = '#00ff0030';
        ctx.font = `${fontSize}px monospace`;
        
        for (let i = 0; i < drops.length; i++) {
            const char = charArray[Math.floor(Math.random() * charArray.length)];
            const x = i * fontSize;
            const y = drops[i] * fontSize;
            
            ctx.fillText(char, x, y);
            
            // Reset drop randomly or when it reaches bottom
            if (y > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            
            drops[i]++;
        }
    }
    
    // Animation loop
    function animate() {
        drawMatrix();
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Boot Sequence Animation
function initBootSequence() {
    const bootScreen = document.getElementById('boot-screen');
    const mainContent = document.getElementById('main-content');
    
    if (!bootScreen || !mainContent) return;
    
    // Animate boot text lines
    const lines = document.querySelectorAll('.boot-text .line');
    lines.forEach((line, index) => {
        setTimeout(() => {
            typeText(line, line.textContent, 50);
        }, index * 1000 + 500);
    });
    
    // Hide boot screen and show main content
    setTimeout(() => {
        bootScreen.style.display = 'none';
        mainContent.classList.remove('hidden');
        
        // Start hero animations
        initHeroAnimations();
    }, 5000);
}

// Typewriter effect
function typeText(element, text, speed = 100) {
    element.textContent = '';
    element.style.opacity = '1';
    
    let index = 0;
    const timer = setInterval(() => {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(timer);
        }
    }, speed);
}

// Navigation System
function initNavigationSystem() {
    const navCommands = document.querySelectorAll('.nav-command');
    
    navCommands.forEach(command => {
        command.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                // Add terminal command effect
                simulateTerminalCommand(this.textContent);
                
                // Smooth scroll to section
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                
                // Update active state
                updateActiveNavigation(this);
            }
        });
    });
}

// Simulate terminal command execution
function simulateTerminalCommand(command) {
    const prompt = document.querySelector('.nav-content .prompt');
    if (!prompt) return;
    
    const originalText = prompt.textContent;
    prompt.textContent = `user@system:~$ ${command}`;
    prompt.style.color = '#ffaa00';
    
    setTimeout(() => {
        prompt.textContent = originalText;
        prompt.style.color = '';
    }, 1000);
}

// Update active navigation
function updateActiveNavigation(activeElement) {
    const navCommands = document.querySelectorAll('.nav-command');
    navCommands.forEach(cmd => cmd.classList.remove('active'));
    activeElement.classList.add('active');
}

// Scroll Effects
function initScrollEffects() {
    const sections = document.querySelectorAll('.section');
    const navCommands = document.querySelectorAll('.nav-command');
    
    // Intersection Observer for section visibility
    const observerOptions = {
        threshold: 0.3,
        rootMargin: '-80px 0px -20% 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                
                // Update active navigation
                navCommands.forEach(cmd => {
                    cmd.classList.remove('active');
                    if (cmd.getAttribute('href') === `#${sectionId}`) {
                        cmd.classList.add('active');
                    }
                });
                
                // Animate section content
                animateSectionContent(entry.target);
            }
        });
    }, observerOptions);
    
    sections.forEach(section => {
        observer.observe(section);
    });
    
    // Parallax effect for terminal windows
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const terminals = document.querySelectorAll('.section-terminal');
        
        terminals.forEach((terminal, index) => {
            const speed = 0.5 + (index * 0.1);
            const translateY = scrolled * speed * 0.1;
            terminal.style.transform = `translateY(${translateY}px)`;
        });
    });
}

// Animate section content when it comes into view
function animateSectionContent(section) {
    const terminal = section.querySelector('.section-terminal');
    if (!terminal || terminal.classList.contains('animated')) return;
    
    terminal.classList.add('animated');
    
    // Animate terminal window appearance
    terminal.style.transform = 'translateY(50px) scale(0.95)';
    terminal.style.opacity = '0';
    
    setTimeout(() => {
        terminal.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        terminal.style.transform = 'translateY(0) scale(1)';
        terminal.style.opacity = '1';
        
        // Animate command line
        setTimeout(() => {
            animateCommandLine(section);
        }, 400);
    }, 100);
}

// Animate command line typing
function animateCommandLine(section) {
    const commandElement = section.querySelector('.command');
    if (!commandElement) return;
    
    const originalText = commandElement.textContent;
    commandElement.textContent = '';
    commandElement.style.borderRight = '2px solid #00ff00';
    
    typeText(commandElement, originalText, 80);
    
    setTimeout(() => {
        commandElement.style.borderRight = 'none';
        animateOutput(section);
    }, originalText.length * 80 + 500);
}

// Animate output content
function animateOutput(section) {
    const outputElements = section.querySelectorAll('.output > *');
    
    outputElements.forEach((element, index) => {
        setTimeout(() => {
            element.style.opacity = '0';
            element.style.transform = 'translateX(-20px)';
            element.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateX(0)';
            }, 50);
        }, index * 200);
    });
}

// Typing Animation for Hero Section
function initTypingAnimation() {
    const typingElements = document.querySelectorAll('.typing-animation');
    
    typingElements.forEach(element => {
        const text = element.textContent;
        element.textContent = '';
        
        setTimeout(() => {
            typeText(element, text, 100);
        }, 6000); // Start after boot sequence
    });
}

// Hero Section Animations
function initHeroAnimations() {
    // Animate neural network nodes
    const nodes = document.querySelectorAll('.node');
    nodes.forEach((node, index) => {
        setTimeout(() => {
            node.style.opacity = '0';
            node.style.transform = 'scale(0)';
            node.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                node.style.opacity = '1';
                node.style.transform = 'scale(1)';
            }, 50);
        }, index * 300 + 1000);
    });
    
    // Animate status indicators
    const indicators = document.querySelectorAll('.indicator');
    indicators.forEach((indicator, index) => {
        setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateY(20px)';
            indicator.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                indicator.style.opacity = '1';
                indicator.style.transform = 'translateY(0)';
            }, 50);
        }, index * 500 + 2000);
    });
}

// Interactive Elements
function initInteractiveElements() {
    // Glitch effect on hover for skill tags
    const skillTags = document.querySelectorAll('.skill-tag');
    skillTags.forEach(tag => {
        tag.addEventListener('mouseenter', function() {
            this.style.animation = 'glitch 0.5s ease';
        });
        
        tag.addEventListener('animationend', function() {
            this.style.animation = '';
        });
    });
    
    // Terminal control interactions
    const terminalControls = document.querySelectorAll('.control');
    terminalControls.forEach(control => {
        control.addEventListener('click', function() {
            const terminal = this.closest('.terminal-header').parentElement;
            
            if (this.classList.contains('minimize')) {
                minimizeTerminal(terminal);
            } else if (this.classList.contains('maximize')) {
                maximizeTerminal(terminal);
            } else if (this.classList.contains('close')) {
                closeTerminal(terminal);
            }
        });
    });
    
    // Project item hover effects
    const projectItems = document.querySelectorAll('.project-item');
    projectItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 30px rgba(0, 170, 255, 0.2)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '';
        });
    });
    
    // Contact item click effects
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Create ripple effect
            createRippleEffect(e, this);
        });
    });
}

// Terminal window interactions
function minimizeTerminal(terminal) {
    terminal.style.transform = 'scaleY(0.1)';
    terminal.style.opacity = '0.5';
    
    setTimeout(() => {
        terminal.style.transform = '';
        terminal.style.opacity = '';
    }, 1000);
}

function maximizeTerminal(terminal) {
    const originalTransform = terminal.style.transform;
    terminal.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
        terminal.style.transform = originalTransform;
    }, 300);
}

function closeTerminal(terminal) {
    terminal.style.transition = 'all 0.5s ease';
    terminal.style.transform = 'scale(0)';
    terminal.style.opacity = '0';
    
    setTimeout(() => {
        terminal.style.transform = '';
        terminal.style.opacity = '';
        terminal.style.transition = '';
    }, 2000);
}

// Create ripple effect
function createRippleEffect(event, element) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.position = 'absolute';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.background = 'rgba(0, 255, 0, 0.3)';
    ripple.style.borderRadius = '50%';
    ripple.style.transform = 'scale(0)';
    ripple.style.transition = 'transform 0.6s ease';
    ripple.style.pointerEvents = 'none';
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.style.transform = 'scale(1)';
    }, 10);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Mobile Optimizations
function initMobileOptimizations() {
    // Touch interactions for mobile
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        
        // Improve touch targets
        const navCommands = document.querySelectorAll('.nav-command');
        navCommands.forEach(command => {
            command.style.minHeight = '44px';
            command.style.display = 'flex';
            command.style.alignItems = 'center';
            command.style.justifyContent = 'center';
        });
        
        // Add touch feedback
        const interactiveElements = document.querySelectorAll('.nav-command, .contact-item, .skill-tag');
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.95)';
            });
            
            element.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });
    }
    
    // Responsive navigation
    const nav = document.querySelector('.nav-terminal');
    if (nav && window.innerWidth <= 768) {
        // Make navigation sticky on mobile
        nav.style.position = 'sticky';
        nav.style.top = '0';
        nav.style.zIndex = '1000';
    }
    
    // Optimize animations for mobile
    if (window.innerWidth <= 768) {
        // Reduce complex animations on mobile
        const style = document.createElement('style');
        style.textContent = `
            .glitch-text {
                animation: none !important;
            }
            .neural-network-visual .connection {
                animation: none !important;
                opacity: 0.3 !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Keyboard Navigation
document.addEventListener('keydown', function(e) {
    // Navigate with arrow keys
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const navCommands = document.querySelectorAll('.nav-command');
        const activeCommand = document.querySelector('.nav-command.active');
        
        let currentIndex = Array.from(navCommands).indexOf(activeCommand);
        let nextIndex;
        
        if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % navCommands.length;
        } else {
            nextIndex = (currentIndex - 1 + navCommands.length) % navCommands.length;
        }
        
        navCommands[nextIndex].click();
    }
    
    // Quick navigation with number keys
    const numberKeys = ['1', '2', '3', '4', '5', '6'];
    if (numberKeys.includes(e.key)) {
        const index = parseInt(e.key) - 1;
        const navCommands = document.querySelectorAll('.nav-command');
        if (navCommands[index]) {
            navCommands[index].click();
        }
    }
});

// Performance optimizations
function optimizePerformance() {
    // Lazy load heavy animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Start heavy animations only when visible
                if (entry.target.classList.contains('neural-network-visual')) {
                    initNeuralNetworkAnimation(entry.target);
                }
            }
        });
    });
    
    document.querySelectorAll('.neural-network-visual').forEach(element => {
        observer.observe(element);
    });
    
    // Debounce scroll events
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(() => {
            // Perform scroll-based updates
            updateScrollProgress();
        }, 16); // ~60fps
    });
}

// Neural Network Animation
function initNeuralNetworkAnimation(container) {
    const nodes = container.querySelectorAll('.node');
    const connections = container.querySelectorAll('.connection');
    
    // Create dynamic connections
    setInterval(() => {
        const randomConnection = connections[Math.floor(Math.random() * connections.length)];
        randomConnection.style.animation = 'none';
        setTimeout(() => {
            randomConnection.style.animation = 'dataFlow 2s ease';
        }, 100);
    }, 3000);
}

// Update scroll progress
function updateScrollProgress() {
    const scrollProgress = window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight);
    
    // Update any progress indicators if they exist
    const progressIndicator = document.querySelector('.scroll-progress');
    if (progressIndicator) {
        progressIndicator.style.width = `${scrollProgress * 100}%`;
    }
}

// Initialize performance optimizations
setTimeout(optimizePerformance, 1000);

// Console Easter Egg
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     SYSTEM INITIALIZED                      ║
║                                                              ║
║  Welcome to Lincoln Stewart's Portfolio Terminal            ║
║  Version: 2.0.1                                             ║
║  Status: ONLINE                                              ║
║                                                              ║
║  Available Commands:                                         ║
║  • Use arrow keys for navigation                             ║
║  • Number keys (1-6) for quick section access               ║
║  • Click terminal controls for interactions                  ║
║                                                              ║
║  Contact: lincolnstewart4@gmail.com                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Error handling
window.addEventListener('error', function(e) {
    console.warn('Portfolio Error:', e.message);
    // Graceful degradation - ensure basic functionality works
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker if available
        // This would be for future PWA features
    });
}