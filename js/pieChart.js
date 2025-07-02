// ================================================
// PIE CHART IMPLEMENTATION USING D3.JS
// ================================================

/**
 * PieChart class for creating interactive pie charts
 */
class PieChart {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            margin: { top: 40, right: 40, bottom: 40, left: 40 },
            width: 800,
            height: 500,
            categoryField: 'category',
            valueField: 'value',
            title: 'Pie Chart',
            showTooltip: true,
            showLegend: true,
            showLabels: true,
            showPercentages: true,
            animationDuration: 1000,
            colors: Utils.generateColorPalette(20, 'categorical'),
            innerRadius: 0,
            outerRadius: null,
            padAngle: 0.02,
            cornerRadius: 3,
            ...options
        };

        this.data = [];
        this.processedData = [];
        this.scales = {};
        this.svg = null;
        this.tooltip = null;
        this.selectedSlices = new Set();
        
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        this.createSVG();
        this.createTooltip();
        this.setupEventListeners();
    }

    /**
     * Create SVG container
     */
    createSVG() {
        const { svg, g, width, height } = Utils.createResponsiveSVG(this.container, this.options);
        this.svg = svg;
        this.g = g;
        this.width = width;
        this.height = height;

        // Calculate chart dimensions
        const radius = Math.min(this.width, this.height) / 2 - 20;
        this.options.outerRadius = this.options.outerRadius || radius;

        // Create chart groups
        this.g.append('g').attr('class', 'pie-slices');
        this.g.append('g').attr('class', 'pie-labels');
        this.g.append('text').attr('class', 'chart-title');
        
        // Center the pie chart
        this.g.select('.pie-slices')
            .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
        
        this.g.select('.pie-labels')
            .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
    }

    /**
     * Create tooltip
     */
    createTooltip() {
        if (this.options.showTooltip) {
            this.tooltip = Utils.createTooltip();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', Utils.debounce(() => {
            this.resize();
        }, 250));
    }

    /**
     * Update chart with new data
     * @param {Array} data - Data array
     */
    updateData(data) {
        this.data = data || [];
        this.processData();
        this.updateScales();
        this.render();
    }

    /**
     * Process and aggregate data
     */
    processData() {
        if (!this.data.length) {
            this.processedData = [];
            return;
        }

        const { categoryField, valueField } = this.options;

        // Group data by category and sum values
        const grouped = d3.group(this.data, d => d[categoryField]);
        this.processedData = Array.from(grouped, ([key, values]) => ({
            category: key,
            value: d3.sum(values, d => d[valueField] || 0),
            count: values.length,
            percentage: 0, // Will be calculated after total
            originalData: values
        }));

        // Calculate percentages
        const total = d3.sum(this.processedData, d => d.value);
        this.processedData.forEach(d => {
            d.percentage = total > 0 ? (d.value / total) * 100 : 0;
        });

        // Sort by value descending
        this.processedData.sort((a, b) => b.value - a.value);

        // Limit to top N categories for readability
        const maxSlices = 15;
        if (this.processedData.length > maxSlices) {
            const topCategories = this.processedData.slice(0, maxSlices - 1);
            const otherCategories = this.processedData.slice(maxSlices - 1);
            const otherTotal = d3.sum(otherCategories, d => d.value);
            const otherCount = d3.sum(otherCategories, d => d.count);
            
            topCategories.push({
                category: 'Others',
                value: otherTotal,
                count: otherCount,
                percentage: total > 0 ? (otherTotal / total) * 100 : 0,
                originalData: otherCategories.flatMap(d => d.originalData)
            });
            
            this.processedData = topCategories;
        }
    }

    /**
     * Update scales
     */
    updateScales() {
        if (!this.processedData.length) return;

        // Color Scale
        const categories = this.processedData.map(d => d.category);
        this.scales.color = d3.scaleOrdinal()
            .domain(categories)
            .range(this.options.colors);

        // Pie generator
        this.pie = d3.pie()
            .value(d => d.value)
            .sort(null)
            .padAngle(this.options.padAngle);

        // Arc generator
        this.arc = d3.arc()
            .innerRadius(this.options.innerRadius)
            .outerRadius(this.options.outerRadius)
            .cornerRadius(this.options.cornerRadius);

        // Label arc (for positioning labels)
        this.labelArc = d3.arc()
            .innerRadius(this.options.outerRadius * 0.6)
            .outerRadius(this.options.outerRadius * 0.6);

        // Outer arc for leader lines
        this.outerArc = d3.arc()
            .innerRadius(this.options.outerRadius * 1.1)
            .outerRadius(this.options.outerRadius * 1.1);
    }

    /**
     * Render the chart
     */
    render() {
        if (!this.processedData.length) {
            this.renderEmpty();
            return;
        }

        this.renderSlices();
        this.renderLabels();
        this.renderTitle();
        
        if (this.options.showLegend) {
            this.renderLegend();
        }
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        this.g.selectAll('*').remove();
        
        this.g.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .attr('class', 'empty-message')
            .style('font-size', '18px')
            .style('fill', '#999')
            .text('No data available');
    }

    /**
     * Render pie slices
     */
    renderSlices() {
        const pieData = this.pie(this.processedData);

        // Bind data
        const slices = this.g.select('.pie-slices')
            .selectAll('.slice')
            .data(pieData, d => d.data.category);

        // Remove old slices
        slices.exit()
            .transition()
            .duration(this.options.animationDuration)
            .attrTween('d', (d) => {
                const interpolate = d3.interpolate(d, { startAngle: d.startAngle, endAngle: d.startAngle });
                return (t) => this.arc(interpolate(t));
            })
            .style('opacity', 0)
            .remove();

        // Add new slices
        const slicesEnter = slices.enter()
            .append('path')
            .attr('class', 'slice')
            .style('fill', d => this.scales.color(d.data.category))
            .style('stroke', 'white')
            .style('stroke-width', 2)
            .style('cursor', 'pointer')
            .attr('d', this.arc)
            .style('opacity', 0);

        // Update all slices
        slices.merge(slicesEnter)
            .on('mouseover', (event, d) => this.handleSliceMouseOver(event, d))
            .on('mousemove', (event, d) => this.handleSliceMouseMove(event, d))
            .on('mouseout', (event, d) => this.handleSliceMouseOut(event, d))
            .on('click', (event, d) => this.handleSliceClick(event, d))
            .transition()
            .duration(this.options.animationDuration)
            .style('opacity', 1)
            .attrTween('d', function(d) {
                const current = this._current || { startAngle: 0, endAngle: 0 };
                const interpolate = d3.interpolate(current, d);
                this._current = d;
                return (t) => this.arc(interpolate(t));
            }.bind(this));
    }

    /**
     * Render labels
     */
    renderLabels() {
        if (!this.options.showLabels) return;

        const pieData = this.pie(this.processedData);
        const threshold = 2; // Minimum percentage to show label

        // Filter out small slices
        const labelData = pieData.filter(d => d.data.percentage >= threshold);

        // Label lines
        const lines = this.g.select('.pie-labels')
            .selectAll('.label-line')
            .data(labelData, d => d.data.category);

        lines.exit().remove();

        const linesEnter = lines.enter()
            .append('polyline')
            .attr('class', 'label-line')
            .style('fill', 'none')
            .style('stroke', '#666')
            .style('stroke-width', 1)
            .style('opacity', 0);

        lines.merge(linesEnter)
            .transition()
            .duration(this.options.animationDuration)
            .style('opacity', 0.6)
            .attr('points', d => {
                const centroid = this.labelArc.centroid(d);
                const outerCentroid = this.outerArc.centroid(d);
                const labelPos = this.getLabelPosition(d);
                return [centroid, outerCentroid, labelPos];
            });

        // Label text
        const labels = this.g.select('.pie-labels')
            .selectAll('.label-text')
            .data(labelData, d => d.data.category);

        labels.exit().remove();

        const labelsEnter = labels.enter()
            .append('text')
            .attr('class', 'label-text')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('fill', 'currentColor')
            .style('opacity', 0);

        labels.merge(labelsEnter)
            .transition()
            .duration(this.options.animationDuration)
            .style('opacity', 1)
            .attr('transform', d => `translate(${this.getLabelPosition(d)})`)
            .attr('text-anchor', d => this.midAngle(d) < Math.PI ? 'start' : 'end')
            .text(d => {
                const label = d.data.category;
                const percentage = this.options.showPercentages ? ` (${d.data.percentage.toFixed(1)}%)` : '';
                return label + percentage;
            });
    }

    /**
     * Get label position
     */
    getLabelPosition(d) {
        const outerCentroid = this.outerArc.centroid(d);
        const x = outerCentroid[0] * 1.2;
        const y = outerCentroid[1];
        return [x, y];
    }

    /**
     * Calculate middle angle
     */
    midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

    /**
     * Render chart title
     */
    renderTitle() {
        this.g.select('.chart-title')
            .attr('x', this.width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .style('fill', 'currentColor')
            .text(this.options.title);
    }

    /**
     * Render legend
     */
    renderLegend() {
        const legendContainer = d3.select(this.container)
            .select('.chart-legend');
        
        if (legendContainer.empty()) return;

        legendContainer.selectAll('*').remove();

        const legendItems = legendContainer
            .selectAll('.legend-item')
            .data(this.processedData)
            .enter()
            .append('div')
            .attr('class', 'legend-item')
            .style('cursor', 'pointer')
            .on('click', (event, d) => this.toggleSlice(d.category));

        legendItems.append('div')
            .attr('class', 'legend-color')
            .style('background-color', d => this.scales.color(d.category));

        legendItems.append('span')
            .html(d => `${d.category} <small>(${d.percentage.toFixed(1)}%)</small>`);
    }

    /**
     * Handle slice mouse over events
     */
    handleSliceMouseOver(event, d) {
        if (!this.options.showTooltip) return;

        // Highlight slice
        d3.select(event.currentTarget)
            .transition()
            .duration(100)
            .style('opacity', 0.8)
            .style('stroke-width', 3);

        // Show tooltip
        const content = this.generateTooltipContent(d);
        this.tooltip.show(content, event);
    }

    /**
     * Handle slice mouse move events
     */
    handleSliceMouseMove(event, d) {
        if (this.options.showTooltip) {
            this.tooltip.move(event);
        }
    }

    /**
     * Handle slice mouse out events
     */
    handleSliceMouseOut(event, d) {
        if (!this.selectedSlices.has(d.data.category)) {
            d3.select(event.currentTarget)
                .transition()
                .duration(100)
                .style('opacity', 1)
                .style('stroke-width', 2);
        }

        if (this.options.showTooltip) {
            this.tooltip.hide();
        }
    }

    /**
     * Handle slice click events
     */
    handleSliceClick(event, d) {
        this.toggleSlice(d.data.category);
        this.onSliceSelect(Array.from(this.selectedSlices), d.data);
    }

    /**
     * Toggle slice selection
     */
    toggleSlice(category) {
        if (this.selectedSlices.has(category)) {
            this.selectedSlices.delete(category);
        } else {
            this.selectedSlices.add(category);
        }

        // Update visual state
        this.g.selectAll('.slice')
            .style('opacity', d => this.selectedSlices.has(d.data.category) ? 0.6 : 1)
            .style('stroke-width', d => this.selectedSlices.has(d.data.category) ? 4 : 2);
    }

    /**
     * Generate tooltip content
     */
    generateTooltipContent(d) {
        return `
            <div style="font-weight: bold; margin-bottom: 5px;">${d.data.category}</div>
            <div>Value: ${Utils.formatNumber(d.data.value)}</div>
            <div>Percentage: ${d.data.percentage.toFixed(1)}%</div>
            <div>Count: ${d.data.count}</div>
        `;
    }

    /**
     * Slice selection callback
     */
    onSliceSelect(selectedSlices, clickedData) {
        // Override this method to handle slice selection
        console.log('Selected slices:', selectedSlices, 'Clicked:', clickedData);
    }

    /**
     * Get selected slices
     */
    getSelectedSlices() {
        return Array.from(this.selectedSlices);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedSlices.clear();
        this.g.selectAll('.slice')
            .style('opacity', 1)
            .style('stroke-width', 2);
    }

    /**
     * Convert to donut chart
     */
    setDonutMode(enable, innerRadiusRatio = 0.4) {
        this.options.innerRadius = enable ? this.options.outerRadius * innerRadiusRatio : 0;
        this.updateScales();
        this.render();
    }

    /**
     * Resize chart
     */
    resize() {
        const containerElement = d3.select(this.container);
        const containerRect = containerElement.node().getBoundingClientRect();
        
        this.width = containerRect.width - this.options.margin.left - this.options.margin.right;
        this.height = this.options.height - this.options.margin.top - this.options.margin.bottom;

        // Update radius
        const radius = Math.min(this.width, this.height) / 2 - 20;
        this.options.outerRadius = radius;

        // Update SVG dimensions
        this.svg
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`);

        // Re-center the chart
        this.g.select('.pie-slices')
            .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
        
        this.g.select('.pie-labels')
            .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);

        // Re-render chart
        this.updateScales();
        this.render();
    }

    /**
     * Update chart options
     * @param {Object} newOptions - New options to merge
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        if (this.data.length > 0) {
            this.processData();
            this.updateScales();
            this.render();
        }
    }

    /**
     * Export chart data
     * @returns {Array} Current processed data
     */
    exportData() {
        return this.processedData;
    }

    /**
     * Destroy chart and cleanup
     */
    destroy() {
        if (this.svg) {
            this.svg.remove();
        }
        if (this.tooltip) {
            d3.select('body').select('.tooltip-custom').remove();
        }
        window.removeEventListener('resize', this.resize);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PieChart;
}
