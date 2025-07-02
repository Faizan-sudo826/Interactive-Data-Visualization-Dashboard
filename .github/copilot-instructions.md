<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Data Visualization Dashboard - Copilot Instructions

## Project Overview
This is an interactive data visualization dashboard built with D3.js, HTML, CSS, and vanilla JavaScript. The application provides three main chart types (bar chart, line chart, scatter plot) with interactive features like tooltips, zooming, filtering, and exporting.

## Code Style and Architecture

### JavaScript
- Use ES6+ features (arrow functions, const/let, template literals, destructuring)
- Follow modular design patterns with separate classes for each chart type
- Use D3.js v7 syntax and patterns consistently
- Implement proper error handling and data validation
- Use meaningful variable and function names
- Add comprehensive JSDoc comments for all functions

### CSS
- Use CSS custom properties (variables) for theming
- Follow mobile-first responsive design principles
- Use flexbox and grid for layouts
- Implement smooth transitions and animations
- Support both light and dark themes
- Use semantic class names following BEM methodology where appropriate

### HTML
- Use semantic HTML5 elements
- Ensure accessibility with proper ARIA labels
- Structure content logically for screen readers
- Use data attributes for JavaScript hooks

## D3.js Patterns
- Use D3's data join pattern (enter, update, exit) for efficient rendering
- Implement proper scale functions for data mapping
- Use SVG for chart rendering with appropriate groups and transforms
- Handle events properly with D3's event system
- Implement smooth transitions for visual feedback

## Data Handling
- Support multiple data formats (CSV, JSON)
- Implement automatic type detection and conversion
- Provide data validation and cleaning capabilities
- Support real-time filtering and transformation
- Handle missing or invalid data gracefully

## Interactive Features
- Implement tooltips using D3 and custom CSS
- Support brush selection for data filtering
- Provide zoom and pan functionality where appropriate
- Enable keyboard navigation and shortcuts
- Support touch interactions for mobile devices

## Performance Considerations
- Use debouncing for frequent events (resize, input)
- Implement efficient data filtering algorithms
- Clean up event listeners and DOM elements properly
- Optimize rendering for large datasets
- Use requestAnimationFrame for smooth animations

## Browser Compatibility
- Target modern browsers (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
- Use feature detection rather than browser detection
- Provide fallbacks for unsupported features
- Test responsiveness across different screen sizes

## File Organization
- Keep chart implementations in separate files (barChart.js, lineChart.js, scatterPlot.js)
- Use utils.js for shared utility functions
- Separate data loading logic in dataLoader.js
- Keep main application logic in main.js
- Organize CSS with clear sections and comments

## Documentation
- Maintain comprehensive README.md with usage examples
- Include inline code comments for complex logic
- Document all public methods and properties
- Provide examples for extending functionality

## Testing and Debugging
- Include console.log statements for debugging during development
- Implement proper error boundaries and fallbacks
- Test with various data sizes and formats
- Validate accessibility with screen readers

When suggesting improvements or new features, consider:
1. Maintaining consistency with existing code patterns
2. Ensuring responsive design compatibility
3. Following D3.js best practices
4. Keeping accessibility in mind
5. Optimizing for performance
6. Supporting both themes (light/dark)
7. Maintaining modular architecture
