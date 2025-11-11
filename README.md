# Lincoln Stewart - Software Engineer Portfolio

A modern, minimalist ePortfolio website with terminal aesthetics, designed for Lincoln Stewart, Software Engineer specializing in Intelligent Automation & Systems Integration.

## Features

- **Terminal-inspired Design**: Dark theme with monospace fonts and terminal window aesthetics
- **Animated Boot Sequence**: System initialization simulation with typewriter effects
- **Matrix Rain Background**: Subtle animated background inspired by The Matrix
- **Interactive Elements**: Hover effects, glitch animations, and terminal command simulations
- **Neural Network Visualizations**: Animated nodes and connections representing AI/ML expertise
- **Responsive Design**: Optimized for mobile devices with touch interactions
- **Smooth Animations**: CSS animations and JavaScript interactions for engaging UX
- **GitHub Pages Ready**: Static website optimized for deployment

## Technologies Used

- HTML5 (Semantic structure)
- CSS3 (Custom animations, Grid/Flexbox, CSS Variables)
- Vanilla JavaScript (ES6+, Intersection Observer, Canvas API)
- No external dependencies for maximum performance

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/llstewart/MyWebsite.git
cd MyWebsite
```

2. Open `index.html` in your browser or use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

3. Navigate to `http://localhost:8000`

## GitHub Pages Deployment

1. Push your code to a GitHub repository
2. Go to repository Settings > Pages
3. Select source: Deploy from branch
4. Choose `main` branch and `/ (root)` folder
5. Save and wait for deployment (usually 1-2 minutes)

Your site will be available at: `https://yourusername.github.io/MyWebsite/`

## Performance Features

- **Lazy Loading**: Heavy animations load only when visible
- **Optimized Canvas**: Matrix effect with efficient rendering
- **Responsive Images**: Scaled appropriately for different screen sizes
- **Debounced Events**: Scroll and resize events optimized for performance
- **Progressive Enhancement**: Works without JavaScript (degraded experience)
- **Mobile Optimizations**: Touch-friendly interactions and reduced animations

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility Features

- Semantic HTML structure
- Keyboard navigation support (arrow keys, number keys)
- High contrast mode support
- Reduced motion support for users with vestibular disorders
- Screen reader friendly content structure

## Customization

### Colors
Modify CSS variables in `:root` selector in `assets/css/style.css`:

```css
:root {
    --bg-primary: #0a0a0a;
    --text-primary: #00ff00;
    --accent-blue: #00aaff;
    /* ... other colors */
}
```

### Content
Update the following sections in `index.html`:
- Personal information in hero section
- Work experience details
- Project descriptions
- Skills and technologies
- Contact information

### Animations
Modify animation speeds and effects in `assets/js/main.js` and CSS animation keyframes.

## File Structure

```
MyWebsite/
├── index.html              # Main HTML file
├── assets/
│   ├── css/
│   │   └── style.css      # All styles and animations
│   └── js/
│       └── main.js        # JavaScript functionality
├── README.md              # This file
└── LICENSE                # License file
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Lincoln Stewart
- Email: lincolnstewart4@gmail.com
- LinkedIn: [linkedin.com/in/lincoln-stewart01](https://www.linkedin.com/in/lincoln-stewart01)
- Phone: 443-460-8224

## Credits

- Matrix digital rain effect inspired by The Matrix (1999)
- Terminal aesthetics inspired by various Unix/Linux terminals
- Neural network visualizations representing AI/ML expertise
- Responsive design following modern web standards