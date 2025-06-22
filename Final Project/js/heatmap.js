// ================================================
// HEATMAP IMPLEMENTATION USING D3.JS
// ================================================

/**
 * Heatmap class for creating interactive heatmaps
 */
class Heatmap {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            margin: { top: 80, right: 100, bottom: 80, left: 120 },
            width: 800,
            height: 500,
            xField: 'x',
            yField: 'y',
            valueField: 'value',
            title: 'Heatmap',
            xAxisLabel: 'X Categories',
            yAxisLabel: 'Y Categories',
            showTooltip: true,
            showLegend: true,
            animationDuration: 1000,
            colorScheme: 'interpolateViridis', // 'interpolateViridis', 'interpolateBlues', 'interpolateReds', etc.
            cellPadding: 2,
            ...options
        };

        this.data = [];
        this.processedData = [];
        this.matrixData = [];
        this.scales = {};
        this.svg = null;
        this.tooltip = null;
        this.selectedCells = new Set();
        
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

        // Create chart groups
        this.g.append('g').attr('class', 'heatmap-cells');
        this.g.append('g').attr('class', 'x-axis');
        this.g.append('g').attr('class', 'y-axis');
        this.g.append('g').attr('class', 'x-axis-label');
        this.g.append('g').attr('class', 'y-axis-label');
        this.g.append('text').attr('class', 'chart-title');
        this.g.append('g').attr('class', 'color-legend');
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
     * Process data into matrix format
     */
    processData() {
        if (!this.data.length) {
            this.processedData = [];
            this.matrixData = [];
            return;
        }

        const { xField, yField, valueField } = this.options;

        // Create matrix structure
        const matrix = {};
        const xCategories = new Set();
        const yCategories = new Set();

        // Group data and aggregate values
        this.data.forEach(d => {
            const xVal = d[xField];
            const yVal = d[yField];
            const value = d[valueField];

            if (xVal !== null && xVal !== undefined && 
                yVal !== null && yVal !== undefined && 
                value !== null && value !== undefined && !isNaN(value)) {
                
                xCategories.add(xVal);
                yCategories.add(yVal);

                const key = `${xVal}|${yVal}`;
                if (!matrix[key]) {
                    matrix[key] = {
                        x: xVal,
                        y: yVal,
                        value: 0,
                        count: 0,
                        originalData: []
                    };
                }
                matrix[key].value += parseFloat(value);
                matrix[key].count += 1;
                matrix[key].originalData.push(d);
            }
        });

        // Convert to array and calculate averages
        this.processedData = Object.values(matrix).map(d => ({
            ...d,
            value: d.value / d.count // Average value
        }));

        // Sort categories
        this.xCategories = Array.from(xCategories).sort();
        this.yCategories = Array.from(yCategories).sort();

        // Create complete matrix (fill missing values with 0)
        this.matrixData = [];
        this.yCategories.forEach(yVal => {
            this.xCategories.forEach(xVal => {
                const key = `${xVal}|${yVal}`;
                const existing = matrix[key];
                this.matrixData.push({
                    x: xVal,
                    y: yVal,
                    value: existing ? existing.value / existing.count : 0,
                    count: existing ? existing.count : 0,
                    originalData: existing ? existing.originalData : []
                });
            });
        });
    }

    /**
     * Update scales
     */
    updateScales() {
        if (!this.matrixData.length) return;

        // X Scale (Band)
        this.scales.x = d3.scaleBand()
            .domain(this.xCategories)
            .range([0, this.width])
            .padding(this.options.cellPadding / 100);

        // Y Scale (Band)
        this.scales.y = d3.scaleBand()
            .domain(this.yCategories)
            .range([0, this.height])
            .padding(this.options.cellPadding / 100);

        // Color Scale
        const values = this.matrixData.map(d => d.value);
        const extent = d3.extent(values);
        
        // Handle case where all values are the same
        if (extent[0] === extent[1]) {
            extent[1] = extent[0] + 1;
        }

        this.scales.color = d3.scaleSequential()
            .domain(extent)
            .interpolator(d3[this.options.colorScheme] || d3.interpolateViridis);
    }

    /**
     * Render the chart
     */
    render() {
        if (!this.matrixData.length) {
            this.renderEmpty();
            return;
        }

        this.renderCells();
        this.renderAxes();
        this.renderTitle();
        this.renderLabels();
        
        if (this.options.showLegend) {
            this.renderColorLegend();
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
     * Render heatmap cells
     */
    renderCells() {
        // Bind data
        const cells = this.g.select('.heatmap-cells')
            .selectAll('.heatmap-cell')
            .data(this.matrixData, d => `${d.x}-${d.y}`);

        // Remove old cells
        cells.exit()
            .transition()
            .duration(this.options.animationDuration)
            .style('opacity', 0)
            .remove();

        // Add new cells
        const cellsEnter = cells.enter()
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => this.scales.x(d.x))
            .attr('y', d => this.scales.y(d.y))
            .attr('width', this.scales.x.bandwidth())
            .attr('height', this.scales.y.bandwidth())
            .style('fill', d => this.scales.color(d.value))
            .style('stroke', 'white')
            .style('stroke-width', 1)
            .style('opacity', 0)
            .style('cursor', 'pointer');

        // Update all cells
        cells.merge(cellsEnter)
            .on('mouseover', (event, d) => this.handleCellMouseOver(event, d))
            .on('mousemove', (event, d) => this.handleCellMouseMove(event, d))
            .on('mouseout', (event, d) => this.handleCellMouseOut(event, d))
            .on('click', (event, d) => this.handleCellClick(event, d))
            .transition()
            .duration(this.options.animationDuration)
            .style('opacity', 1)
            .attr('x', d => this.scales.x(d.x))
            .attr('y', d => this.scales.y(d.y))
            .attr('width', this.scales.x.bandwidth())
            .attr('height', this.scales.y.bandwidth())
            .style('fill', d => this.scales.color(d.value));
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
            .tickSizeOuter(0);

        this.g.select('.y-axis')
            .transition()
            .duration(this.options.animationDuration)
            .call(yAxis);
    }

    /**
     * Render chart title
     */
    renderTitle() {
        this.g.select('.chart-title')
            .attr('x', this.width / 2)
            .attr('y', -30)
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
     * Render color legend
     */
    renderColorLegend() {
        const legendWidth = 20;
        const legendHeight = 200;
        const legendX = this.width + 20;
        const legendY = (this.height - legendHeight) / 2;

        const legend = this.g.select('.color-legend');
        legend.selectAll('*').remove();

        // Create gradient
        const gradient = this.svg.select('defs')
            .selectAll('#heatmap-gradient')
            .data([1]);
        
        const gradientEnter = gradient.enter()
            .append('linearGradient')
            .attr('id', 'heatmap-gradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', legendHeight)
            .attr('x2', 0).attr('y2', 0);

        gradient.merge(gradientEnter)
            .selectAll('stop')
            .data(d3.range(0, 1.1, 0.1))
            .join('stop')
            .attr('offset', d => `${d * 100}%`)
            .attr('stop-color', d => {
                const domain = this.scales.color.domain();
                const value = domain[0] + d * (domain[1] - domain[0]);
                return this.scales.color(value);
            });

        // Legend rectangle
        legend.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#heatmap-gradient)')
            .style('stroke', '#ccc')
            .style('stroke-width', 1);

        // Legend scale
        const legendScale = d3.scaleLinear()
            .domain(this.scales.color.domain())
            .range([legendHeight, 0]);

        const legendAxis = d3.axisRight(legendScale)
            .tickFormat(d => Utils.formatNumber(d))
            .ticks(5);

        legend.append('g')
            .attr('transform', `translate(${legendX + legendWidth}, ${legendY})`)
            .call(legendAxis)
            .style('font-size', '12px');

        // Legend title
        legend.append('text')
            .attr('x', legendX + legendWidth / 2)
            .attr('y', legendY - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', 'currentColor')
            .text('Value');
    }

    /**
     * Handle cell mouse over events
     */
    handleCellMouseOver(event, d) {
        if (!this.options.showTooltip) return;

        // Highlight cell
        d3.select(event.currentTarget)
            .style('stroke-width', 3)
            .style('stroke', '#333');

        // Show tooltip
        const content = this.generateTooltipContent(d);
        this.tooltip.show(content, event);
    }

    /**
     * Handle cell mouse move events
     */
    handleCellMouseMove(event, d) {
        if (this.options.showTooltip) {
            this.tooltip.move(event);
        }
    }

    /**
     * Handle cell mouse out events
     */
    handleCellMouseOut(event, d) {
        const cellId = this.getCellId(d);
        
        if (!this.selectedCells.has(cellId)) {
            d3.select(event.currentTarget)
                .style('stroke-width', 1)
                .style('stroke', 'white');
        }

        if (this.options.showTooltip) {
            this.tooltip.hide();
        }
    }

    /**
     * Handle cell click events
     */
    handleCellClick(event, d) {
        const cellId = this.getCellId(d);
        
        if (this.selectedCells.has(cellId)) {
            this.selectedCells.delete(cellId);
            d3.select(event.currentTarget)
                .style('stroke-width', 1)
                .style('stroke', 'white');
        } else {
            this.selectedCells.add(cellId);
            d3.select(event.currentTarget)
                .style('stroke-width', 3)
                .style('stroke', '#333');
        }

        // Trigger selection event
        this.onCellSelect(Array.from(this.selectedCells), d);
    }

    /**
     * Generate tooltip content
     */
    generateTooltipContent(d) {
        return `
            <div style="font-weight: bold; margin-bottom: 5px;">
                ${this.options.xAxisLabel}: ${d.x}<br>
                ${this.options.yAxisLabel}: ${d.y}
            </div>
            <div>Value: ${Utils.formatNumber(d.value)}</div>
            <div>Count: ${d.count}</div>
        `;
    }

    /**
     * Get unique cell ID
     */
    getCellId(d) {
        return `${d.x}-${d.y}`;
    }

    /**
     * Cell selection callback
     */
    onCellSelect(selectedCells, clickedData) {
        // Override this method to handle cell selection
        console.log('Selected cells:', selectedCells, 'Clicked:', clickedData);
    }

    /**
     * Get selected cells
     */
    getSelectedCells() {
        return Array.from(this.selectedCells);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedCells.clear();
        this.g.selectAll('.heatmap-cell')
            .style('stroke-width', 1)
            .style('stroke', 'white');
    }

    /**
     * Change color scheme
     */
    setColorScheme(scheme) {
        this.options.colorScheme = scheme;
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

        // Update SVG dimensions
        this.svg
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`);

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
     * @returns {Array} Current matrix data
     */
    exportData() {
        return this.matrixData;
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
    module.exports = Heatmap;
}
