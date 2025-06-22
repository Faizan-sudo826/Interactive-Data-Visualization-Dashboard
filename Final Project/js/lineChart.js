// ================================================
// LINE CHART IMPLEMENTATION USING D3.JS
// ================================================

/**
 * LineChart class for creating interactive line charts
 */
class LineChart {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            margin: { top: 40, right: 40, bottom: 80, left: 80 },
            width: 800,
            height: 500,
            xField: 'date',
            yField: 'value',
            groupField: null,
            title: 'Line Chart',
            xAxisLabel: 'Time',
            yAxisLabel: 'Values',
            showGrid: true,
            showTooltip: true,
            showLegend: true,
            showDots: true,
            curveType: 'curveMonotoneX',
            animationDuration: 1000,
            colors: Utils.generateColorPalette(10, 'categorical'),
            lineWidth: 3,
            dotRadius: 4,
            ...options
        };

        this.data = [];
        this.filteredData = [];
        this.groupedData = [];
        this.scales = {};
        this.svg = null;
        this.tooltip = null;
        this.selectedDots = new Set();
        this.brush = null;
        this.zoom = null;
        
        this.init();
    }

    /**
     * Initialize the chart
     */
    init() {
        this.createSVG();
        this.createTooltip();
        this.setupInteractions();
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

        // Create clip path for lines
        this.svg.append('defs')
            .append('clipPath')
            .attr('id', 'line-clip')
            .append('rect')
            .attr('width', this.width)
            .attr('height', this.height);

        // Create chart groups
        this.g.append('g').attr('class', 'grid');
        this.g.append('g').attr('class', 'lines').attr('clip-path', 'url(#line-clip)');
        this.g.append('g').attr('class', 'dots').attr('clip-path', 'url(#line-clip)');
        this.g.append('g').attr('class', 'x-axis');
        this.g.append('g').attr('class', 'y-axis');
        this.g.append('g').attr('class', 'x-axis-label');
        this.g.append('g').attr('class', 'y-axis-label');
        this.g.append('text').attr('class', 'chart-title');
        this.g.append('g').attr('class', 'brush-group');
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
     * Setup interactions (zoom and brush)
     */
    setupInteractions() {
        // Setup zoom
        this.zoom = d3.zoom()
            .scaleExtent([0.5, 10])
            .on('zoom', (event) => this.handleZoom(event));

        // Setup brush for selection
        this.brush = d3.brushX()
            .extent([[0, 0], [this.width, this.height]])
            .on('brush end', (event) => this.handleBrush(event));

        // Add zoom behavior to SVG
        this.svg.call(this.zoom);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', Utils.debounce(() => {
            this.resize();
        }, 250));

        // Keyboard shortcuts
        d3.select('body').on('keydown', (event) => {
            if (event.key === 'Escape') {
                this.clearSelection();
                this.resetZoom();
            }
        });
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
     * Process and group data
     */
    processData() {
        if (!this.data.length) {
            this.filteredData = [];
            this.groupedData = [];
            return;
        }

        const { xField, yField, groupField } = this.options;
        
        // Filter and sort data
        this.filteredData = this.data
            .filter(d => d[xField] && d[yField] !== null && d[yField] !== undefined)
            .sort((a, b) => new Date(a[xField]) - new Date(b[xField]));

        // Group data if groupField is specified
        if (groupField) {
            const grouped = d3.group(this.filteredData, d => d[groupField]);
            this.groupedData = Array.from(grouped, ([key, values]) => ({
                key,
                values: values.sort((a, b) => new Date(a[xField]) - new Date(b[xField]))
            }));
        } else {
            this.groupedData = [{
                key: 'default',
                values: this.filteredData
            }];
        }
    }

    /**
     * Update scales
     */
    updateScales() {
        if (!this.filteredData.length) return;

        const { xField, yField, groupField } = this.options;

        // X Scale (Time)
        const xExtent = d3.extent(this.filteredData, d => new Date(d[xField]));
        this.scales.x = d3.scaleTime()
            .domain(xExtent)
            .range([0, this.width]);

        // Y Scale (Linear)
        const yExtent = d3.extent(this.filteredData, d => d[yField]);
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        this.scales.y = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([this.height, 0])
            .nice();

        // Color Scale
        if (groupField) {
            const colorDomain = this.groupedData.map(d => d.key);
            this.scales.color = d3.scaleOrdinal()
                .domain(colorDomain)
                .range(this.options.colors);
        } else {
            this.scales.color = () => this.options.colors[0];
        }

        // Line generator
        this.line = d3.line()
            .x(d => this.scales.x(new Date(d[xField])))
            .y(d => this.scales.y(d[yField]))
            .curve(d3[this.options.curveType] || d3.curveMonotoneX)
            .defined(d => d[yField] !== null && d[yField] !== undefined);
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
        this.renderLines();
        
        if (this.options.showDots) {
            this.renderDots();
        }
        
        this.renderTitle();
        this.renderLabels();
        
        if (this.options.showLegend && this.options.groupField) {
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
            .tickFormat(d3.timeFormat('%b %d'))
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

        // X Grid lines
        const xGrid = d3.axisBottom(this.scales.x)
            .tickSize(-this.height)
            .tickFormat('')
            .ticks(5);

        // Y Grid lines
        const yGrid = d3.axisLeft(this.scales.y)
            .tickSize(-this.width)
            .tickFormat('')
            .ticks(5);

        this.g.select('.grid')
            .selectAll('.x-grid').remove();
        
        this.g.select('.grid')
            .selectAll('.y-grid').remove();

        this.g.select('.grid')
            .append('g')
            .attr('class', 'x-grid')
            .attr('transform', `translate(0, ${this.height})`)
            .transition()
            .duration(this.options.animationDuration)
            .call(xGrid)
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);

        this.g.select('.grid')
            .append('g')
            .attr('class', 'y-grid')
            .transition()
            .duration(this.options.animationDuration)
            .call(yGrid)
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);
    }

    /**
     * Render lines
     */
    renderLines() {
        // Bind data
        const lines = this.g.select('.lines')
            .selectAll('.line')
            .data(this.groupedData, d => d.key);

        // Remove old lines
        lines.exit()
            .transition()
            .duration(this.options.animationDuration)
            .style('opacity', 0)
            .remove();

        // Add new lines
        const linesEnter = lines.enter()
            .append('path')
            .attr('class', 'line')
            .style('fill', 'none')
            .style('stroke-width', this.options.lineWidth)
            .style('stroke', d => this.scales.color(d.key))
            .style('opacity', 0);

        // Update all lines
        lines.merge(linesEnter)
            .transition()
            .duration(this.options.animationDuration)
            .style('opacity', 1)
            .style('stroke', d => this.scales.color(d.key))
            .attr('d', d => this.line(d.values));
    }

    /**
     * Render dots
     */
    renderDots() {
        const { xField, yField } = this.options;
        
        // Flatten data for dots
        const dotData = this.groupedData.flatMap(group => 
            group.values.map(d => ({ ...d, group: group.key }))
        );

        // Bind data
        const dots = this.g.select('.dots')
            .selectAll('.dot')
            .data(dotData, d => `${d.group}-${d[xField]}-${d[yField]}`);

        // Remove old dots
        dots.exit()
            .transition()
            .duration(this.options.animationDuration)
            .attr('r', 0)
            .remove();

        // Add new dots
        const dotsEnter = dots.enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('r', 0)
            .attr('cx', d => this.scales.x(new Date(d[xField])))
            .attr('cy', d => this.scales.y(d[yField]))
            .style('fill', d => this.scales.color(d.group))
            .style('stroke', 'white')
            .style('stroke-width', 2)
            .style('cursor', 'pointer');

        // Update all dots
        dots.merge(dotsEnter)
            .on('mouseover', (event, d) => this.handleDotMouseOver(event, d))
            .on('mousemove', (event, d) => this.handleDotMouseMove(event, d))
            .on('mouseout', (event, d) => this.handleDotMouseOut(event, d))
            .on('click', (event, d) => this.handleDotClick(event, d))
            .transition()
            .duration(this.options.animationDuration)
            .attr('r', this.options.dotRadius)
            .attr('cx', d => this.scales.x(new Date(d[xField])))
            .attr('cy', d => this.scales.y(d[yField]))
            .style('fill', d => this.scales.color(d.group));
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

        const legendItems = legendContainer
            .selectAll('.legend-item')
            .data(this.groupedData)
            .enter()
            .append('div')
            .attr('class', 'legend-item');

        legendItems.append('div')
            .attr('class', 'legend-color')
            .style('background-color', d => this.scales.color(d.key));

        legendItems.append('span')
            .text(d => d.key);
    }

    /**
     * Handle dot mouse over events
     */
    handleDotMouseOver(event, d) {
        if (!this.options.showTooltip) return;

        // Highlight dot
        d3.select(event.currentTarget)
            .transition()
            .duration(100)
            .attr('r', this.options.dotRadius * 1.5)
            .style('stroke-width', 3);

        // Show tooltip
        const content = this.generateTooltipContent(d);
        this.tooltip.show(content, event);
    }

    /**
     * Handle dot mouse move events
     */
    handleDotMouseMove(event, d) {
        if (this.options.showTooltip) {
            this.tooltip.move(event);
        }
    }

    /**
     * Handle dot mouse out events
     */
    handleDotMouseOut(event, d) {
        const dotId = this.getDotId(d);
        
        if (!this.selectedDots.has(dotId)) {
            d3.select(event.currentTarget)
                .transition()
                .duration(100)
                .attr('r', this.options.dotRadius)
                .style('stroke-width', 2);
        }

        if (this.options.showTooltip) {
            this.tooltip.hide();
        }
    }

    /**
     * Handle dot click events
     */
    handleDotClick(event, d) {
        const dotId = this.getDotId(d);
        
        if (this.selectedDots.has(dotId)) {
            this.selectedDots.delete(dotId);
            d3.select(event.currentTarget)
                .classed('selected', false)
                .style('stroke-width', 2);
        } else {
            this.selectedDots.add(dotId);
            d3.select(event.currentTarget)
                .classed('selected', true)
                .style('stroke-width', 4);
        }

        // Trigger selection event
        this.onDotSelect(Array.from(this.selectedDots), d);
    }

    /**
     * Handle zoom events
     */
    handleZoom(event) {
        const { transform } = event;
        
        // Update scales
        const newXScale = transform.rescaleX(this.scales.x);
        const newYScale = transform.rescaleY(this.scales.y);

        // Update axes
        this.g.select('.x-axis').call(d3.axisBottom(newXScale).tickFormat(d3.timeFormat('%b %d')));
        this.g.select('.y-axis').call(d3.axisLeft(newYScale).tickFormat(d => Utils.formatNumber(d)));

        // Update lines
        const newLine = d3.line()
            .x(d => newXScale(new Date(d[this.options.xField])))
            .y(d => newYScale(d[this.options.yField]))
            .curve(d3[this.options.curveType] || d3.curveMonotoneX);

        this.g.selectAll('.line')
            .attr('d', d => newLine(d.values));

        // Update dots
        this.g.selectAll('.dot')
            .attr('cx', d => newXScale(new Date(d[this.options.xField])))
            .attr('cy', d => newYScale(d[this.options.yField]));
    }

    /**
     * Handle brush events
     */
    handleBrush(event) {
        const { selection } = event;
        
        if (!selection) {
            this.clearBrushSelection();
            return;
        }

        const [x0, x1] = selection.map(this.scales.x.invert);
        
        // Select dots within brush area
        this.g.selectAll('.dot')
            .classed('brushed', d => {
                const date = new Date(d[this.options.xField]);
                return date >= x0 && date <= x1;
            });

        this.onBrushSelect(x0, x1);
    }

    /**
     * Generate tooltip content
     */
    generateTooltipContent(d) {
        const { xField, yField, groupField } = this.options;
        return `
            <div style="font-weight: bold; margin-bottom: 5px;">
                ${groupField ? `${d.group} - ` : ''}${Utils.formatDate(d[xField])}
            </div>
            <div>${this.options.yAxisLabel}: ${Utils.formatNumber(d[yField])}</div>
            ${Object.keys(d).filter(key => ![xField, yField, groupField, 'group'].includes(key))
                .map(key => `<div>${key}: ${d[key]}</div>`).join('')}
        `;
    }

    /**
     * Get unique dot ID
     */
    getDotId(d) {
        return `${d.group || 'default'}-${d[this.options.xField]}-${d[this.options.yField]}`;
    }

    /**
     * Dot selection callback
     */
    onDotSelect(selectedDots, clickedData) {
        // Override this method to handle dot selection
        console.log('Selected dots:', selectedDots, 'Clicked:', clickedData);
    }

    /**
     * Brush selection callback
     */
    onBrushSelect(startDate, endDate) {
        // Override this method to handle brush selection
        console.log('Brush selection:', startDate, endDate);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedDots.clear();
        this.g.selectAll('.dot')
            .classed('selected', false)
            .style('stroke-width', 2);
    }

    /**
     * Clear brush selection
     */
    clearBrushSelection() {
        this.g.selectAll('.dot').classed('brushed', false);
        this.g.select('.brush-group').call(this.brush.clear);
    }

    /**
     * Reset zoom
     */
    resetZoom() {
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity);
    }

    /**
     * Enable brush selection
     */
    enableBrush() {
        this.g.select('.brush-group')
            .call(this.brush);
    }

    /**
     * Disable brush selection
     */
    disableBrush() {
        this.g.select('.brush-group')
            .selectAll('*').remove();
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
        this.svg.select('#line-clip rect')
            .attr('width', this.width)
            .attr('height', this.height);

        // Update brush extent
        this.brush.extent([[0, 0], [this.width, this.height]]);

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
        d3.select('body').on('keydown', null);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LineChart;
}
