// ================================================
// BAR CHART IMPLEMENTATION USING D3.JS
// ================================================

/**
 * BarChart class for creating interactive bar charts
 */
class BarChart {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            margin: { top: 40, right: 40, bottom: 80, left: 80 },
            width: 800,
            height: 500,
            xField: 'category',
            yField: 'value',
            colorField: null,
            title: 'Bar Chart',
            xAxisLabel: 'Categories',
            yAxisLabel: 'Values',
            showGrid: true,
            showTooltip: true,
            showLegend: true,
            animationDuration: 1000,
            colors: Utils.generateColorPalette(10, 'categorical'),
            ...options
        };

        this.data = [];
        this.filteredData = [];
        this.scales = {};
        this.svg = null;
        this.tooltip = null;
        this.selectedBars = new Set();
        
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

        // Create clip path for bars
        this.svg.append('defs')
            .append('clipPath')
            .attr('id', 'bar-clip')
            .append('rect')
            .attr('width', this.width)
            .attr('height', this.height);

        // Create chart groups
        this.g.append('g').attr('class', 'grid');
        this.g.append('g').attr('class', 'bars').attr('clip-path', 'url(#bar-clip)');
        this.g.append('g').attr('class', 'x-axis');
        this.g.append('g').attr('class', 'y-axis');
        this.g.append('g').attr('class', 'x-axis-label');
        this.g.append('g').attr('class', 'y-axis-label');
        this.g.append('text').attr('class', 'chart-title');
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
            this.filteredData = [];
            return;
        }

        const { xField, yField } = this.options;

        // Group data by x field and sum y values
        const grouped = d3.group(this.data, d => d[xField]);
        this.filteredData = Array.from(grouped, ([key, values]) => ({
            [xField]: key,
            [yField]: d3.sum(values, d => d[yField] || 0),
            count: values.length,
            originalData: values
        }));

        // Sort by value descending
        this.filteredData.sort((a, b) => b[yField] - a[yField]);
    }

    /**
     * Update scales
     */
    updateScales() {
        if (!this.filteredData.length) return;

        const { xField, yField } = this.options;

        // X Scale (Ordinal)
        this.scales.x = d3.scaleBand()
            .domain(this.filteredData.map(d => d[xField]))
            .range([0, this.width])
            .padding(0.1);

        // Y Scale (Linear)
        const yMax = d3.max(this.filteredData, d => d[yField]) || 0;
        this.scales.y = d3.scaleLinear()
            .domain([0, yMax * 1.05]) // Add 5% padding
            .range([this.height, 0])
            .nice();

        // Color Scale
        if (this.options.colorField) {
            const colorDomain = [...new Set(this.filteredData.map(d => d[this.options.colorField]))];
            this.scales.color = d3.scaleOrdinal()
                .domain(colorDomain)
                .range(this.options.colors);
        } else {
            this.scales.color = () => this.options.colors[0];
        }
    }

    /**
     * Render the chart
     */
    render() {
        if (!this.filteredData.length) {
            this.renderEmpty();
            return;
        }

        this.renderAxes();
        this.renderGrid();
        this.renderBars();
        this.renderTitle();
        this.renderLabels();
        
        if (this.options.showLegend && this.options.colorField) {
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
     * Render axes
     */
    renderAxes() {
        // X Axis
        const xAxis = d3.axisBottom(this.scales.x)
            .tickSizeOuter(0);

        this.g.select('.x-axis')
            .attr('transform', `translate(0, ${this.height})`)
            .transition()
            .duration(this.options.animationDuration)
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        // Y Axis
        const yAxis = d3.axisLeft(this.scales.y)
            .tickFormat(d => Utils.formatNumber(d))
            .tickSizeOuter(0);

        this.g.select('.y-axis')
            .transition()
            .duration(this.options.animationDuration)
            .call(yAxis);
    }

    /**
     * Render grid lines
     */
    renderGrid() {
        if (!this.options.showGrid) return;

        // Y Grid lines
        const yGrid = d3.axisLeft(this.scales.y)
            .tickSize(-this.width)
            .tickFormat('')
            .ticks(5);

        this.g.select('.grid')
            .transition()
            .duration(this.options.animationDuration)
            .call(yGrid)
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);
    }

    /**
     * Render bars
     */
    renderBars() {
        const { xField, yField, colorField } = this.options;
        
        // Bind data
        const bars = this.g.select('.bars')
            .selectAll('.bar')
            .data(this.filteredData, d => d[xField]);

        // Remove old bars
        bars.exit()
            .transition()
            .duration(this.options.animationDuration)
            .attr('height', 0)
            .attr('y', this.height)
            .remove();

        // Add new bars
        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => this.scales.x(d[xField]))
            .attr('y', this.height)
            .attr('width', this.scales.x.bandwidth())
            .attr('height', 0)
            .style('fill', d => this.scales.color(colorField ? d[colorField] : d[xField]))
            .style('stroke', 'white')
            .style('stroke-width', 1)
            .style('cursor', 'pointer');

        // Update all bars
        bars.merge(barsEnter)
            .on('mouseover', (event, d) => this.handleMouseOver(event, d))
            .on('mousemove', (event, d) => this.handleMouseMove(event, d))
            .on('mouseout', (event, d) => this.handleMouseOut(event, d))
            .on('click', (event, d) => this.handleClick(event, d))
            .transition()
            .duration(this.options.animationDuration)
            .attr('x', d => this.scales.x(d[xField]))
            .attr('y', d => this.scales.y(d[yField]))
            .attr('width', this.scales.x.bandwidth())
            .attr('height', d => this.height - this.scales.y(d[yField]))
            .style('fill', d => this.scales.color(colorField ? d[colorField] : d[xField]));
    }

    /**
     * Render chart title
     */
    renderTitle() {
        this.g.select('.chart-title')
            .attr('x', this.width / 2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .style('fill', 'currentColor')
            .text(this.options.title);
    }

    /**
     * Render axis labels
     */
    renderLabels() {
        // X Axis Label
        this.g.select('.x-axis-label')
            .selectAll('*').remove();
        
        this.g.select('.x-axis-label')
            .append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height + this.options.margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', 'currentColor')
            .text(this.options.xAxisLabel);

        // Y Axis Label
        this.g.select('.y-axis-label')
            .selectAll('*').remove();
        
        this.g.select('.y-axis-label')
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -this.options.margin.left + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', 'currentColor')
            .text(this.options.yAxisLabel);
    }

    /**
     * Render legend
     */
    renderLegend() {
        const legendContainer = d3.select(this.container)
            .select('.chart-legend');
        
        if (legendContainer.empty()) return;

        legendContainer.selectAll('*').remove();

        const legendData = this.scales.color.domain();
        const legendItems = legendContainer
            .selectAll('.legend-item')
            .data(legendData)
            .enter()
            .append('div')
            .attr('class', 'legend-item');

        legendItems.append('div')
            .attr('class', 'legend-color')
            .style('background-color', d => this.scales.color(d));

        legendItems.append('span')
            .text(d => d);
    }

    /**
     * Handle mouse over events
     */
    handleMouseOver(event, d) {
        if (!this.options.showTooltip) return;

        // Highlight bar
        d3.select(event.currentTarget)
            .style('opacity', 0.8)
            .style('stroke-width', 2);

        // Show tooltip
        const content = this.generateTooltipContent(d);
        this.tooltip.show(content, event);
    }

    /**
     * Handle mouse move events
     */
    handleMouseMove(event, d) {
        if (this.options.showTooltip) {
            this.tooltip.move(event);
        }
    }

    /**
     * Handle mouse out events
     */
    handleMouseOut(event, d) {
        if (!this.selectedBars.has(d[this.options.xField])) {
            d3.select(event.currentTarget)
                .style('opacity', 1)
                .style('stroke-width', 1);
        }

        if (this.options.showTooltip) {
            this.tooltip.hide();
        }
    }

    /**
     * Handle click events
     */
    handleClick(event, d) {
        const key = d[this.options.xField];
        
        if (this.selectedBars.has(key)) {
            this.selectedBars.delete(key);
            d3.select(event.currentTarget)
                .classed('selected', false)
                .style('stroke-width', 1);
        } else {
            this.selectedBars.add(key);
            d3.select(event.currentTarget)
                .classed('selected', true)
                .style('stroke-width', 3);
        }

        // Trigger selection event
        this.onBarSelect(Array.from(this.selectedBars), d);
    }

    /**
     * Generate tooltip content
     */
    generateTooltipContent(d) {
        const { xField, yField } = this.options;
        return `
            <div style="font-weight: bold; margin-bottom: 5px;">${d[xField]}</div>
            <div>${this.options.yAxisLabel}: ${Utils.formatNumber(d[yField])}</div>
            <div>Count: ${d.count}</div>
        `;
    }

    /**
     * Bar selection callback
     */
    onBarSelect(selectedBars, clickedData) {
        // Override this method to handle bar selection
        console.log('Selected bars:', selectedBars, 'Clicked:', clickedData);
    }

    /**
     * Get selected bars
     */
    getSelectedBars() {
        return Array.from(this.selectedBars);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedBars.clear();
        this.g.selectAll('.bar')
            .classed('selected', false)
            .style('stroke-width', 1);
    }

    /**
     * Resize chart
     */
    resize() {
        const containerElement = d3.select(this.container);
        const containerRect = containerElement.node().getBoundingClientRect();
        
        this.width = containerRect.width - this.options.margin.left - this.options.margin.right;
        this.height = this.options.height - this.options.margin.top - this.options.margin.bottom;

        // Update SVG dimensions
        this.svg
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`);

        // Update clip path
        this.svg.select('#bar-clip rect')
            .attr('width', this.width)
            .attr('height', this.height);

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
     * @returns {Array} Current filtered data
     */
    exportData() {
        return this.filteredData;
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
    module.exports = BarChart;
}
