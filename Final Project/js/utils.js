// ================================================
// UTILITY FUNCTIONS FOR DATA VISUALIZATION
// ================================================

/**
 * Utility class containing helper functions for data visualization
 */
class Utils {
    
    /**
     * Format numbers with appropriate suffixes (K, M, B)
     * @param {number} num - The number to format
     * @param {number} precision - Decimal places
     * @returns {string} Formatted number string
     */
    static formatNumber(num, precision = 1) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        
        const absNum = Math.abs(num);
        if (absNum >= 1e9) {
            return (num / 1e9).toFixed(precision) + 'B';
        } else if (absNum >= 1e6) {
            return (num / 1e6).toFixed(precision) + 'M';
        } else if (absNum >= 1e3) {
            return (num / 1e3).toFixed(precision) + 'K';
        } else {
            return num.toFixed(precision);
        }
    }

    /**
     * Format currency values
     * @param {number} value - The currency value
     * @param {string} currency - Currency symbol
     * @returns {string} Formatted currency string
     */
    static formatCurrency(value, currency = '$') {
        if (value === null || value === undefined || isNaN(value)) return '-';
        return currency + this.formatNumber(value, 2);
    }

    /**
     * Format date objects to readable strings
     * @param {Date|string} date - The date to format
     * @param {string} format - Format type ('short', 'long', 'medium')
     * @returns {string} Formatted date string
     */
    static formatDate(date, format = 'medium') {
        if (!date) return '-';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return '-';
        
        const options = {
            short: { month: 'short', day: 'numeric' },
            medium: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        };
        
        return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
    }

    /**
     * Generate color palette for visualizations
     * @param {number} count - Number of colors needed
     * @param {string} type - Color scheme type ('categorical', 'sequential', 'diverging')
     * @returns {Array} Array of color strings
     */
    static generateColorPalette(count, type = 'categorical') {
        const schemes = {
            categorical: [
                '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545',
                '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'
            ],
            sequential: (n) => d3.schemeBlues[Math.max(3, Math.min(9, n))],
            diverging: (n) => d3.schemeRdYlBu[Math.max(3, Math.min(11, n))]
        };

        if (type === 'categorical') {
            const colors = schemes.categorical;
            return Array.from({length: count}, (_, i) => colors[i % colors.length]);
        } else {
            return schemes[type](count) || schemes.categorical.slice(0, count);
        }
    }

    /**
     * Create responsive SVG with proper margins
     * @param {string} container - Container selector
     * @param {Object} options - Configuration options
     * @returns {Object} SVG selection and dimensions
     */
    static createResponsiveSVG(container, options = {}) {
        const containerElement = d3.select(container);
        const containerRect = containerElement.node().getBoundingClientRect();
        
        const margin = options.margin || { top: 40, right: 40, bottom: 60, left: 80 };
        const width = (options.width || containerRect.width) - margin.left - margin.right;
        const height = (options.height || 500) - margin.top - margin.bottom;

        // Clear existing content
        containerElement.selectAll('*').remove();

        const svg = containerElement
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        return { svg, g, width, height, margin };
    }

    /**
     * Create and manage tooltip
     * @param {string} className - CSS class for tooltip
     * @returns {Object} Tooltip object with show/hide methods
     */
    static createTooltip(className = 'tooltip-custom') {
        let tooltip = d3.select('body').select(`.${className}`);
        
        if (tooltip.empty()) {
            tooltip = d3.select('body')
                .append('div')
                .attr('class', className);
        }

        return {
            show: function(content, event) {
                tooltip
                    .html(content)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .classed('visible', true);
            },
            hide: function() {
                tooltip.classed('visible', false);
            },
            move: function(event) {
                tooltip
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            }
        };
    }

    /**
     * Debounce function to limit function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function to limit function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Calculate statistical summary of numeric array
     * @param {Array} data - Array of numbers
     * @returns {Object} Statistical summary
     */
    static calculateStats(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return { min: 0, max: 0, mean: 0, median: 0, count: 0 };
        }

        const validData = data.filter(d => !isNaN(d) && d !== null && d !== undefined);
        if (validData.length === 0) {
            return { min: 0, max: 0, mean: 0, median: 0, count: 0 };
        }

        const sorted = validData.slice().sort((a, b) => a - b);
        const count = validData.length;
        const sum = validData.reduce((acc, val) => acc + val, 0);
        const mean = sum / count;
        
        let median;
        if (count % 2 === 0) {
            median = (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
        } else {
            median = sorted[Math.floor(count / 2)];
        }

        return {
            min: Math.min(...validData),
            max: Math.max(...validData),
            mean: mean,
            median: median,
            count: count,
            sum: sum
        };
    }

    /**
     * Filter data based on criteria
     * @param {Array} data - Data to filter
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered data
     */
    static filterData(data, filters) {
        if (!Array.isArray(data) || !filters) return data;

        return data.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                const itemValue = item[key];

                if (filterValue === null || filterValue === undefined) return true;

                if (Array.isArray(filterValue)) {
                    return filterValue.includes(itemValue);
                }

                if (typeof filterValue === 'object' && filterValue.min !== undefined && filterValue.max !== undefined) {
                    return itemValue >= filterValue.min && itemValue <= filterValue.max;
                }

                return itemValue === filterValue;
            });
        });
    }

    /**
     * Export SVG as PNG
     * @param {string} svgSelector - SVG element selector
     * @param {string} filename - Output filename
     * @param {number} scale - Scale factor for export
     */
    static exportToPNG(svgSelector, filename = 'chart.png', scale = 2) {
        const svgElement = document.querySelector(svgSelector);
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        const svgRect = svgElement.getBoundingClientRect();
        canvas.width = svgRect.width * scale;
        canvas.height = svgRect.height * scale;
        ctx.scale(scale, scale);

        img.onload = function() {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    /**
     * Export SVG as SVG file
     * @param {string} svgSelector - SVG element selector
     * @param {string} filename - Output filename
     */
    static exportToSVG(svgSelector, filename = 'chart.svg') {
        const svgElement = document.querySelector(svgSelector);
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Toggle theme between light and dark
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    static toggleTheme(theme) {
        const body = document.body;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = theme || (currentTheme === 'dark' ? 'light' : 'dark');
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('preferred-theme', newTheme);
        
        // Update theme toggle button
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
        
        return newTheme;
    }

    /**
     * Initialize theme from localStorage
     */
    static initializeTheme() {
        const savedTheme = localStorage.getItem('preferred-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        this.toggleTheme(theme);
    }

    /**
     * Generate sample data for testing
     * @param {string} type - Data type ('sales', 'temperature', 'stocks')
     * @param {number} count - Number of data points
     * @returns {Array} Generated data
     */
    static generateSampleData(type = 'sales', count = 50) {
        const generators = {
            sales: () => ({
                date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                value: Math.floor(Math.random() * 10000) + 1000,
                category: ['Electronics', 'Clothing', 'Books', 'Food', 'Sports'][Math.floor(Math.random() * 5)],
                region: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)]
            }),
            temperature: () => ({
                date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                temperature: Math.floor(Math.random() * 40) + 10,
                humidity: Math.floor(Math.random() * 100),
                city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)]
            }),
            stocks: () => ({
                date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                price: Math.random() * 200 + 50,
                volume: Math.floor(Math.random() * 1000000) + 100000,
                symbol: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'][Math.floor(Math.random() * 5)]
            })
        };

        return Array.from({ length: count }, generators[type] || generators.sales);
    }

    /**
     * Animate value changes for counters
     * @param {Element} element - Target element
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} duration - Animation duration in milliseconds
     * @param {Function} formatter - Value formatter function
     */
    static animateValue(element, start, end, duration = 1000, formatter = (val) => val) {
        const range = end - start;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            const current = start + (range * easeProgress);
            
            element.textContent = formatter(current);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
