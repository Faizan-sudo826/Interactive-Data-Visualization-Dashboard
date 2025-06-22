// ================================================
// SCATTER PLOT IMPLEMENTATION USING D3.JS
// ================================================

/**
 * ScatterPlot class for creating interactive scatter plots
 */
class ScatterPlot {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            margin: { top: 40, right: 40, bottom: 80, left: 80 },
            width: 800,
            height: 500,
            xField: 'x',
            yField: 'y',
            sizeField: null,
            colorField: null,
            title: 'Scatter Plot',
            xAxisLabel: 'X Values',
            yAxisLabel: 'Y Values',
            showGrid: true,
            showTooltip: true,
            showLegend: true,
            animationDuration: 1000,
            colors: Utils.generateColorPalette(10, 'categorical'),
            dotRadius: 5,
            maxDotRadius: 15,
            minDotRadius: 3,
            opacity: 0.7,
            ...options
        };

        this.data = [];
        this.filteredData = [];
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

        // Create clip path for dots
        this.svg.append('defs')
            .append('clipPath')
            .attr('id', 'scatter-clip')
            .append('rect')
            .attr('width', this.width)
            .attr('height', this.height);

        // Create chart groups
        this.g.append('g').attr('class', 'grid');
        this.g.append('g').attr('class', 'dots').attr('clip-path', 'url(#scatter-clip)');
        this.g.append('g').attr('class', 'x-axis');
        this.g.append('g').attr('class', 'y-axis');
        this.g.append('g').attr('class', 'x-axis-label');
        this.g.append('g').attr('class', 'y-axis-label');
        this.g.append('text').attr('class', 'chart-title');
        this.g.append('g').attr('class', 'brush-group');
        this.g.append('g').attr('class', 'regression-line');
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
        this.brush = d3.brush()
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
     * Process data
     */
    processData() {
        if (!this.data.length) {
            this.filteredData = [];
            return;
        }

        const { xField, yField } = this.options;
        
        // Filter data with valid x and y values
        this.filteredData = this.data.filter(d => 
            d[xField] !== null && d[xField] !== undefined && !isNaN(d[xField]) &&
            d[yField] !== null && d[yField] !== undefined && !isNaN(d[yField])
        );
    }

    /**
     * Update scales
     */
    updateScales() {
        if (!this.filteredData.length) return;

        const { xField, yField, colorField, sizeField } = this.options;

        // X Scale (Linear)
        const xExtent = d3.extent(this.filteredData, d => d[xField]);
        const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
        this.scales.x = d3.scaleLinear()
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([0, this.width])
            .nice();

        // Y Scale (Linear)
        const yExtent = d3.extent(this.filteredData, d => d[yField]);
        const yPadding = (yExtent[1] - yExtent[0]) * 0.05;
        this.scales.y = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([this.height, 0])
            .nice();

        // Color Scale
        if (colorField) {
            const colorValues = this.filteredData.map(d => d[colorField]);
            const isNumeric = colorValues.every(v => !isNaN(v));
            
            if (isNumeric) {
                const colorExtent = d3.extent(colorValues);
                this.scales.color = d3.scaleSequential(d3.interpolateViridis)
                    .domain(colorExtent);
            } else {
                const colorDomain = [...new Set(colorValues)];
                this.scales.color = d3.scaleOrdinal()
                    .domain(colorDomain)
                    .range(this.options.colors);
            }
        } else {
            this.scales.color = () => this.options.colors[0];
        }

        // Size Scale
        if (sizeField) {
            const sizeExtent = d3.extent(this.filteredData, d => d[sizeField]);
            this.scales.size = d3.scaleSqrt()
                .domain(sizeExtent)
                .range([this.options.minDotRadius, this.options.maxDotRadius]);
        } else {
            this.scales.size = () => this.options.dotRadius;
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
        this.renderDots();
        this.renderTitle();
        this.renderLabels();
        this.renderRegressionLine();
        
        if (this.options.showLegend && (this.options.colorField || this.options.sizeField)) {
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
            .tickFormat(d => Utils.formatNumber(d))
            .tickSizeOuter(0);

        this.g.select('.x-axis')
            .attr('transform', `translate(0, ${this.height})`)
            .transition()
            .duration(this.options.animationDuration)
            .call(xAxis);

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
            .ticks(8);

        // Y Grid lines
        const yGrid = d3.axisLeft(this.scales.y)
            .tickSize(-this.width)
            .tickFormat('')
            .ticks(8);

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
     * Render scatter dots
     */
    renderDots() {
        const { xField, yField, colorField, sizeField } = this.options;
        
        // Bind data
        const dots = this.g.select('.dots')
            .selectAll('.scatter-dot')
            .data(this.filteredData, (d, i) => `${d[xField]}-${d[yField]}-${i}`);

        // Remove old dots
        dots.exit()
            .transition()
            .duration(this.options.animationDuration)
            .attr('r', 0)
            .style('opacity', 0)
            .remove();

        // Add new dots
        const dotsEnter = dots.enter()
            .append('circle')
            .attr('class', 'scatter-dot')
            .attr('r', 0)
            .attr('cx', d => this.scales.x(d[xField]))
            .attr('cy', d => this.scales.y(d[yField]))
            .style('fill', d => this.scales.color(colorField ? d[colorField] : 'default'))
            .style('stroke', 'white')
            .style('stroke-width', 1)
            .style('opacity', 0)
            .style('cursor', 'pointer');

        // Update all dots
        dots.merge(dotsEnter)
            .on('mouseover', (event, d) => this.handleDotMouseOver(event, d))
            .on('mousemove', (event, d) => this.handleDotMouseMove(event, d))
            .on('mouseout', (event, d) => this.handleDotMouseOut(event, d))
            .on('click', (event, d) => this.handleDotClick(event, d))
            .transition()
            .duration(this.options.animationDuration)
            .attr('r', d => this.scales.size(sizeField ? d[sizeField] : this.options.dotRadius))
            .attr('cx', d => this.scales.x(d[xField]))
            .attr('cy', d => this.scales.y(d[yField]))
            .style('fill', d => this.scales.color(colorField ? d[colorField] : 'default'))
            .style('opacity', this.options.opacity);
    }

    /**
     * Render regression line
     */
    renderRegressionLine() {
        if (!this.options.showRegressionLine || this.filteredData.length < 2) return;

        const { xField, yField } = this.options;
        
        // Calculate linear regression
        const regression = this.calculateLinearRegression(
            this.filteredData.map(d => d[xField]),
            this.filteredData.map(d => d[yField])
        );

        if (!regression) return;

        const xExtent = d3.extent(this.filteredData, d => d[xField]);
        const lineData = [
            { x: xExtent[0], y: regression.slope * xExtent[0] + regression.intercept },
            { x: xExtent[1], y: regression.slope * xExtent[1] + regression.intercept }
        ];

        const line = d3.line()
            .x(d => this.scales.x(d.x))
            .y(d => this.scales.y(d.y));

        this.g.select('.regression-line')
            .selectAll('.regression')
            .data([lineData])
            .join('path')
            .attr('class', 'regression')
            .style('stroke', '#ff6b6b')
            .style('stroke-width', 2)
            .style('stroke-dasharray', '5,5')
            .style('fill', 'none')
            .attr('d', line);

        // Add R² value
        this.g.select('.regression-line')
            .selectAll('.r-squared')
            .data([regression])
            .join('text')
            .attr('class', 'r-squared')
            .attr('x', this.width - 10)
            .attr('y', 20)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .style('fill', '#ff6b6b')
            .text(d => `R² = ${d.rSquared.toFixed(3)}`);
    }

    /**
     * Calculate linear regression
     */
    calculateLinearRegression(xValues, yValues) {
        const n = xValues.length;
        if (n < 2) return null;

        const sumX = d3.sum(xValues);
        const sumY = d3.sum(yValues);
        const sumXY = d3.sum(xValues.map((x, i) => x * yValues[i]));
        const sumXX = d3.sum(xValues.map(x => x * x));
        const sumYY = d3.sum(yValues.map(y => y * y));

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const yMean = sumY / n;
        const ssTotal = d3.sum(yValues.map(y => Math.pow(y - yMean, 2)));
        const ssResidual = d3.sum(yValues.map((y, i) => Math.pow(y - (slope * xValues[i] + intercept), 2)));
        const rSquared = 1 - (ssResidual / ssTotal);

        return { slope, intercept, rSquared };
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

        // Color legend
        if (this.options.colorField) {
            const colorDomain = this.scales.color.domain();
            
            if (typeof colorDomain[0] === 'number') {
                // Continuous color scale
                this.renderContinuousColorLegend(legendContainer);
            } else {
                // Discrete color scale
                this.renderDiscreteColorLegend(legendContainer, colorDomain);
            }
        }

        // Size legend
        if (this.options.sizeField) {
            this.renderSizeLegend(legendContainer);
        }
    }

    /**
     * Render discrete color legend
     */
    renderDiscreteColorLegend(container, domain) {
        const legendItems = container
            .selectAll('.legend-item')
            .data(domain)
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
     * Render continuous color legend
     */
    renderContinuousColorLegend(container) {
        const legendSvg = container
            .append('svg')
            .attr('width', 200)
            .attr('height', 30);

        const gradient = legendSvg.append('defs')
            .append('linearGradient')
            .attr('id', 'color-gradient');

        const domain = this.scales.color.domain();
        const stops = d3.range(0, 1.1, 0.1);
        
        gradient.selectAll('stop')
            .data(stops)
            .enter()
            .append('stop')
            .attr('offset', d => `${d * 100}%`)
            .attr('stop-color', d => this.scales.color(domain[0] + d * (domain[1] - domain[0])));

        legendSvg.append('rect')
            .attr('width', 150)
            .attr('height', 20)
            .style('fill', 'url(#color-gradient)');

        legendSvg.append('text')
            .attr('x', 0)
            .attr('y', 15)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .text(Utils.formatNumber(domain[0]));

        legendSvg.append('text')
            .attr('x', 150)
            .attr('y', 15)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .text(Utils.formatNumber(domain[1]));
    }

    /**
     * Render size legend
     */
    renderSizeLegend(container) {
        const sizeDomain = this.scales.size.domain();
        const sizeValues = [sizeDomain[0], (sizeDomain[0] + sizeDomain[1]) / 2, sizeDomain[1]];
        
        const sizeLegend = container
            .append('div')
            .attr('class', 'size-legend')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px');

        sizeValues.forEach(value => {
            const item = sizeLegend.append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('gap', '5px');

            item.append('svg')
                .attr('width', this.options.maxDotRadius * 2)
                .attr('height', this.options.maxDotRadius * 2)
                .append('circle')
                .attr('cx', this.options.maxDotRadius)
                .attr('cy', this.options.maxDotRadius)
                .attr('r', this.scales.size(value))
                .style('fill', this.options.colors[0])
                .style('opacity', this.options.opacity);

            item.append('span')
                .style('font-size', '12px')
                .text(Utils.formatNumber(value));
        });
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
            .style('stroke-width', 3)
            .style('opacity', 1);

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
                .style('stroke-width', 1)
                .style('opacity', this.options.opacity);
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
                .style('stroke-width', 1);
        } else {
            this.selectedDots.add(dotId);
            d3.select(event.currentTarget)
                .classed('selected', true)
                .style('stroke-width', 3);
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
        this.g.select('.x-axis').call(d3.axisBottom(newXScale).tickFormat(d => Utils.formatNumber(d)));
        this.g.select('.y-axis').call(d3.axisLeft(newYScale).tickFormat(d => Utils.formatNumber(d)));

        // Update dots
        this.g.selectAll('.scatter-dot')
            .attr('cx', d => newXScale(d[this.options.xField]))
            .attr('cy', d => newYScale(d[this.options.yField]));

        // Update regression line
        this.g.select('.regression')
            .attr('d', d3.line()
                .x(d => newXScale(d.x))
                .y(d => newYScale(d.y))
            );
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

        const [[x0, y0], [x1, y1]] = selection;
        const xRange = [this.scales.x.invert(x0), this.scales.x.invert(x1)];
        const yRange = [this.scales.y.invert(y1), this.scales.y.invert(y0)]; // y is inverted

        // Select dots within brush area
        this.g.selectAll('.scatter-dot')
            .classed('brushed', d => {
                const x = d[this.options.xField];
                const y = d[this.options.yField];
                return x >= xRange[0] && x <= xRange[1] && y >= yRange[0] && y <= yRange[1];
            });

        this.onBrushSelect(xRange, yRange);
    }

    /**
     * Generate tooltip content
     */
    generateTooltipContent(d) {
        const { xField, yField, colorField, sizeField } = this.options;
        let content = `
            <div style="font-weight: bold; margin-bottom: 5px;">Data Point</div>
            <div>${this.options.xAxisLabel}: ${Utils.formatNumber(d[xField])}</div>
            <div>${this.options.yAxisLabel}: ${Utils.formatNumber(d[yField])}</div>
        `;

        if (colorField && d[colorField] !== undefined) {
            content += `<div>${colorField}: ${d[colorField]}</div>`;
        }

        if (sizeField && d[sizeField] !== undefined) {
            content += `<div>${sizeField}: ${Utils.formatNumber(d[sizeField])}</div>`;
        }

        // Add other fields
        const excludeFields = [xField, yField, colorField, sizeField].filter(f => f);
        const otherFields = Object.keys(d).filter(key => !excludeFields.includes(key));
        
        otherFields.forEach(key => {
            if (d[key] !== null && d[key] !== undefined) {
                content += `<div>${key}: ${d[key]}</div>`;
            }
        });

        return content;
    }

    /**
     * Get unique dot ID
     */
    getDotId(d) {
        return `${d[this.options.xField]}-${d[this.options.yField]}-${JSON.stringify(d)}`;
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
    onBrushSelect(xRange, yRange) {
        // Override this method to handle brush selection
        console.log('Brush selection - X:', xRange, 'Y:', yRange);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedDots.clear();
        this.g.selectAll('.scatter-dot')
            .classed('selected', false)
            .style('stroke-width', 1);
    }

    /**
     * Clear brush selection
     */
    clearBrushSelection() {
        this.g.selectAll('.scatter-dot').classed('brushed', false);
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
     * Show/hide regression line
     */
    toggleRegressionLine(show) {
        this.options.showRegressionLine = show;
        if (show) {
            this.renderRegressionLine();
        } else {
            this.g.select('.regression-line').selectAll('*').remove();
        }
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
        this.svg.select('#scatter-clip rect')
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
    module.exports = ScatterPlot;
}
