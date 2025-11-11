// ===================================
// Application State & Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Initializing app...');
    console.log('📊 Resume data available:', typeof resumeData !== 'undefined');
    
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
    }, 1500);

    // Initialize all components
    initializeNavigation();
    initializeHeroAnimations();
    initializeTypingEffect();
    initializeNeuralNetwork();
    initializePipeline();
    initializeScrollAnimations();
    
    // Populate dynamic content
    console.log('📝 Populating dynamic content...');
    populateExperience();
    populateProjects();
    initializeSkillsInterface();
    initializeContactForm();
    animateStats();
    
    console.log('✅ App initialization complete!');
}

// ===================================
// Navigation
// ===================================

function initializeNavigation() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let lastScroll = 0;

    // Scroll behavior
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            if (currentScroll > lastScroll) {
                navbar.classList.add('hidden');
            } else {
                navbar.classList.remove('hidden');
            }
        }

        lastScroll = currentScroll;

        // Update active nav link
        updateActiveNavLink();
    });

    // Hamburger menu
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Smooth scroll
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 70;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');

    let current = 'home';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// ===================================
// Hero Section Animations
// ===================================

function initializeHeroAnimations() {
    // Glitch effect on hover
    const glitchText = document.querySelector('.glitch-text');
    
    if (glitchText) {
        glitchText.addEventListener('mouseenter', () => {
            glitchText.style.animation = 'glitch 0.3s ease-in-out';
        });
        
        glitchText.addEventListener('animationend', () => {
            glitchText.style.animation = '';
        });
    }

    // Animate metric bar
    setTimeout(() => {
        const metricFill = document.querySelector('.metric-fill');
        if (metricFill) {
            metricFill.classList.add('animated');
        }
    }, 1000);
}

function initializeTypingEffect() {
    const typingElement = document.querySelector('.typing-text');
    if (!typingElement) return;

    const texts = [
        'Software Engineer — Intelligent Automation',
        'Systems Integration Specialist',
        'Full-Stack Developer',
        'AI & Machine Learning Engineer'
    ];
    
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        const currentText = texts[textIndex];
        
        if (isDeleting) {
            typingElement.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            typingElement.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }

        if (!isDeleting && charIndex === currentText.length) {
            typingSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
            typingSpeed = 500;
        }

        setTimeout(type, typingSpeed);
    }

    type();
}

// ===================================
// Neural Network Canvas
// ===================================

function initializeNeuralNetwork() {
    const canvas = document.getElementById('neural-network');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const nodes = [];
    const nodeCount = 50;
    const connectionDistance = 150;

    class Node {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = 2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(74, 158, 255, 0.5)';
            ctx.fill();
        }
    }

    for (let i = 0; i < nodeCount; i++) {
        nodes.push(new Node());
    }

    function drawConnections() {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < connectionDistance) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.strokeStyle = `rgba(74, 158, 255, ${0.2 * (1 - distance / connectionDistance)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        nodes.forEach(node => {
            node.update();
            node.draw();
        });

        drawConnections();
        requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ===================================
// Pipeline Animation
// ===================================

function initializePipeline() {
    const steps = document.querySelectorAll('.pipeline-step');
    const connectors = document.querySelectorAll('.pipeline-connector');
    let currentStep = 0;

    function animatePipeline() {
        steps.forEach((step, index) => {
            if (index <= currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        connectors.forEach((connector, index) => {
            if (index < currentStep) {
                connector.classList.add('active');
            } else {
                connector.classList.remove('active');
            }
        });

        currentStep = (currentStep + 1) % (steps.length + 1);
    }

    setInterval(animatePipeline, 1500);
}

// ===================================
// Scroll Animations
// ===================================

function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe timeline items
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => observer.observe(item));

    // Observe project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => observer.observe(card));

    // Observe skill items
    const skillItems = document.querySelectorAll('.skill-item');
    skillItems.forEach(item => observer.observe(item));
}

// ===================================
// Populate Experience Timeline
// ===================================

function populateExperience() {
    const timeline = document.getElementById('experience-timeline');
    if (!timeline) {
        console.error('Experience timeline element not found');
        return;
    }
    
    if (typeof resumeData === 'undefined') {
        console.error('resumeData is not defined');
        return;
    }
    
    if (!resumeData.experience) {
        console.error('resumeData.experience is not defined');
        return;
    }

    console.log('Populating experience with', resumeData.experience.length, 'jobs');
    timeline.innerHTML = '';

    resumeData.experience.forEach((job, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.style.transitionDelay = `${index * 0.2}s`;

        const descriptionList = job.description.map(item => `<li>${item}</li>`).join('');

        timelineItem.innerHTML = `
            <div class="experience-header">
                <div class="experience-title">
                    <h3>${job.position}</h3>
                    <p class="experience-company">${job.company}</p>
                    <p class="experience-location">${job.location}</p>
                </div>
                <div class="experience-date">${job.startDate} - ${job.endDate}</div>
            </div>
            <ul class="experience-description">
                ${descriptionList}
            </ul>
        `;

        timeline.appendChild(timelineItem);
        
        // Trigger visibility after a short delay to allow for animation
        setTimeout(() => {
            timelineItem.classList.add('visible');
        }, 100 + (index * 100));
    });
}

// ===================================
// Populate Projects
// ===================================

function populateProjects() {
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) {
        console.error('Projects grid element not found');
        return;
    }
    
    if (typeof resumeData === 'undefined') {
        console.error('resumeData is not defined');
        return;
    }
    
    if (!resumeData.projects) {
        console.error('resumeData.projects is not defined');
        return;
    }

    console.log('Populating projects with', resumeData.projects.length, 'projects');
    projectsGrid.innerHTML = '';

    resumeData.projects.forEach((project, index) => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.style.transitionDelay = `${index * 0.2}s`;

        const techTags = project.technologies.map(tech => 
            `<span class="tech-tag">${tech}</span>`
        ).join('');

        const descriptions = project.description.map(desc => 
            `<p>${desc}</p>`
        ).join('');

        projectCard.innerHTML = `
            <div class="project-header">
                <i class="fas ${project.icon} project-icon"></i>
                <span class="project-date">${project.date}</span>
            </div>
            <h3>${project.name}</h3>
            <p style="color: var(--accent-blue); margin-bottom: 1rem; font-weight: 500;">${project.tagline}</p>
            ${descriptions}
            <div class="project-tech">
                ${techTags}
            </div>
        `;

        // Add click interaction
        projectCard.addEventListener('click', () => {
            projectCard.style.transform = 'scale(0.98)';
            setTimeout(() => {
                projectCard.style.transform = '';
            }, 200);
        });

        projectsGrid.appendChild(projectCard);
        
        // Trigger visibility after a short delay to allow for animation
        setTimeout(() => {
            projectCard.classList.add('visible');
        }, 100 + (index * 100));
    });
}

// ===================================
// Skills Interface
// ===================================

function initializeSkillsInterface() {
    const skillTabs = document.querySelectorAll('.skill-tab');
    const skillsContent = document.getElementById('skills-content');

    if (!skillTabs.length || !skillsContent || !resumeData.skills) return;

    // Display initial category
    displaySkills('languages');

    skillTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            skillTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Display skills for selected category
            const category = tab.getAttribute('data-category');
            displaySkills(category);
        });
    });
}

function displaySkills(category) {
    const skillsContent = document.getElementById('skills-content');
    if (!skillsContent) return;

    const skills = resumeData.skills[category];
    if (!skills) return;

    skillsContent.innerHTML = '';

    const skillsGrid = document.createElement('div');
    skillsGrid.className = 'skills-grid';

    skills.forEach((skill, index) => {
        const skillItem = document.createElement('div');
        skillItem.className = 'skill-item';
        skillItem.style.transitionDelay = `${index * 0.05}s`;

        skillItem.innerHTML = `
            <i class="fas ${skill.icon}"></i>
            <span>${skill.name}</span>
        `;

        skillsGrid.appendChild(skillItem);

        // Trigger animation
        setTimeout(() => {
            skillItem.classList.add('visible');
        }, 50);
    });

    skillsContent.appendChild(skillsGrid);
}

// ===================================
// Animate Statistics
// ===================================

function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                animateValue(entry.target, 0, target, 2000);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    statNumbers.forEach(stat => observer.observe(stat));
}

function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    
    window.requestAnimationFrame(step);
}

// ===================================
// Contact Form
// ===================================

function initializeContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        // Create mailto link
        const subject = `Portfolio Contact from ${name}`;
        const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
        const mailtoLink = `mailto:lincolnstewart4@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Open default email client
        window.location.href = mailtoLink;

        // Show confirmation
        showNotification('Opening your email client...');

        // Reset form
        form.reset();
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background-color: var(--accent-blue);
        color: var(--text-primary);
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===================================
// Utility Functions
// ===================================

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offsetTop = section.offsetTop - 70;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

// Add glitch keyframes dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes glitch {
        0% { transform: translate(0); }
        20% { transform: translate(-2px, 2px); }
        40% { transform: translate(-2px, -2px); }
        60% { transform: translate(2px, 2px); }
        80% { transform: translate(2px, -2px); }
        100% { transform: translate(0); }
    }
    
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translateY(10px);
        }
    }
`;
document.head.appendChild(style);

// ===================================
// Easter Eggs & Interactions
// ===================================

// Console message for curious developers
console.log('%c🚀 Lincoln Stewart - Portfolio', 'color: #4a9eff; font-size: 20px; font-weight: bold;');
console.log('%cInterested in how this was built? Let\'s connect!', 'color: #a0a0a0; font-size: 14px;');
console.log('%clincolnstewart4@gmail.com', 'color: #4a9eff; font-size: 14px;');

// Konami code easter egg
let konamiCode = [];
const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);

    if (konamiCode.join(',') === konamiPattern.join(',')) {
        activateMatrixMode();
    }
});

function activateMatrixMode() {
    document.body.style.animation = 'hueRotate 2s ease-in-out';
    showNotification('🎮 Matrix Mode Activated! System efficiency: 100%');
    
    setTimeout(() => {
        document.body.style.animation = '';
    }, 2000);
}

// Add hue rotation animation
const matrixStyle = document.createElement('style');
matrixStyle.textContent = `
    @keyframes hueRotate {
        0%, 100% { filter: hue-rotate(0deg); }
        50% { filter: hue-rotate(180deg); }
    }
`;
document.head.appendChild(matrixStyle);

// Track mouse for parallax effects
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
});

// Apply subtle parallax to hero content
function applyParallax() {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && window.innerWidth > 768) {
        const xOffset = mouseX * 20;
        const yOffset = mouseY * 20;
        heroContent.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    }
    requestAnimationFrame(applyParallax);
}

applyParallax();
