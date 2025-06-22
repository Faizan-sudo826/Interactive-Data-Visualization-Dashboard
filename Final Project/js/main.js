// ================================================
// MAIN APPLICATION - DATA VISUALIZATION DASHBOARD
// ================================================

/**
 * Main Dashboard Application Class
 */
class Dashboard {
    constructor() {
        this.dataLoader = new DataLoader();
        this.currentChart = null;
        this.charts = {};
        this.currentChartType = 'bar';
        this.currentDataSource = 'sales';
        this.fieldMappings = {};
        this.isUserData = false;
        
        this.init();
    }

    /**
     * Initialize the dashboard
     */
    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.setupDataLoader();
        this.loadInitialData();
        this.createInitialChart();
    }

    /**
     * Setup theme functionality
     */
    setupTheme() {
        Utils.initializeTheme();
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                Utils.toggleTheme();
            });
        }
    }

    /**
     * Setup event listeners for controls
     */
    setupEventListeners() {
        // Chart type selector
        const chartTypeSelect = document.getElementById('chartType');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', (e) => {
                this.switchChart(e.target.value);
            });
        }

        // Data source selector
        const dataSourceSelect = document.getElementById('dataSource');
        if (dataSourceSelect) {
            dataSourceSelect.addEventListener('change', (e) => {
                this.switchDataSource(e.target.value);
            });
        }

        // Filter controls
        this.setupFilterControls();

        // Export buttons
        this.setupExportButtons();

        // Range sliders
        this.setupRangeSliders();

        // File import controls
        this.setupFileImport();

        // Field mapping controls
        this.setupFieldMapping();
    }

    /**
     * Setup filter controls
     */
    setupFilterControls() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
    }

    /**
     * Setup export buttons
     */
    setupExportButtons() {
        const exportPNG = document.getElementById('exportPNG');
        const exportSVG = document.getElementById('exportSVG');

        if (exportPNG) {
            exportPNG.addEventListener('click', () => {
                Utils.exportToPNG('#mainChart', `${this.currentChartType}-chart.png`);
            });
        }

        if (exportSVG) {
            exportSVG.addEventListener('click', () => {
                Utils.exportToSVG('#mainChart', `${this.currentChartType}-chart.svg`);
            });
        }
    }

    /**
     * Setup range sliders
     */
    setupRangeSliders() {
        const dateRange = document.getElementById('dateRange');
        const valueRange = document.getElementById('valueRange');

        if (dateRange) {
            dateRange.addEventListener('input', Utils.debounce(() => {
                this.applyFilters();
            }, 300));
        }

        if (valueRange) {
            valueRange.addEventListener('input', Utils.debounce(() => {
                this.applyFilters();
            }, 300));
        }
    }

    /**
     * Setup file import controls
     */
    setupFileImport() {
        const fileInput = document.getElementById('fileInput');
        const fileImportBtn = document.getElementById('fileImportBtn');

        if (fileImportBtn && fileInput) {
            fileImportBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileImport(file);
                }
            });
        }
    }

    /**
     * Setup field mapping controls
     */
    setupFieldMapping() {
        const applyMappingBtn = document.getElementById('applyMapping');
        if (applyMappingBtn) {
            applyMappingBtn.addEventListener('click', () => {
                this.applyFieldMapping();
            });
        }

        // Auto-map when chart type changes if user data is loaded
        const chartTypeSelect = document.getElementById('chartType');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', () => {
                if (this.isUserData) {
                    this.updateFieldMappingUI();
                }
            });
        }
    }

    /**
     * Setup data loader callbacks
     */
    setupDataLoader() {
        this.dataLoader.on('onDataLoad', (data) => {
            this.onDataLoaded(data);
        });

        this.dataLoader.on('onDataChange', (data) => {
            this.onDataChanged(data);
        });

        this.dataLoader.on('onError', (error) => {
            this.onDataError(error);
        });
    }    /**
     * Load initial data
     */
    loadInitialData() {
        console.log('Loading initial data...');
        this.showLoading(true);
        try {
            // Load sample sales data by default
            const data = this.dataLoader.loadSampleData('sales');
            console.log('Initial data loaded:', data);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data');
        }
    }

    /**
     * Create initial chart
     */
    createInitialChart() {
        this.switchChart('bar');
    }    /**
     * Data loaded callback
     */    /**
     * Data loaded callback
     */
    onDataLoaded(data) {
        console.log('Data loaded:', data);
        this.showLoading(false);
        
        // Handle user data differently
        if (data.isUserData) {
            this.isUserData = true;
            this.showFieldMappingUI();
            this.updateFieldMappingUI();
            // Auto-apply mapping and create chart for user data
            setTimeout(() => {
                this.applyFieldMapping();
            }, 100);
        } else {
            this.isUserData = false;
            this.hideFieldMappingUI();
            // For sample data, create chart if it doesn't exist
            if (!this.currentChart) {
                console.log('Creating initial chart for sample data');
                this.createChart(this.currentChartType);
            } else {
                console.log('Updating existing chart with sample data');
                this.updateCurrentChart();
            }
        }
        
        this.updateFilterOptions();
        this.updateDataSummary();
    }

    /**
     * Data changed callback
     */
    onDataChanged(data) {
        console.log('Data changed:', data);
        this.updateDataSummary();
        this.updateCurrentChart();
    }

    /**
     * Data error callback
     */
    onDataError(error) {
        console.error('Data error:', error);
        this.showLoading(false);
        this.showError(error.error?.message || 'Error loading data');
    }    /**
     * Switch chart type
     */
    switchChart(chartType) {
        this.currentChartType = chartType;
        
        // Destroy current chart
        if (this.currentChart && typeof this.currentChart.destroy === 'function') {
            this.currentChart.destroy();
        }

        // Clear chart area
        d3.select('#chartArea').selectAll('*').remove();
        this.currentChart = null;

        // For user data, update field mapping UI and apply mapping
        if (this.isUserData) {
            this.updateFieldMappingUI();
            // Auto-apply new mapping for the chart type
            setTimeout(() => {
                this.applyFieldMapping();
            }, 100);
        } else {
            // Create new chart for sample data
            this.createChart(chartType);
        }
        
        this.updateChartMetadata(chartType);
    }    /**
     * Switch data source
     */
    switchDataSource(dataSource) {
        this.currentDataSource = dataSource;
        this.showLoading(true);
        
        // Clear current chart
        if (this.currentChart && typeof this.currentChart.destroy === 'function') {
            this.currentChart.destroy();
        }
        d3.select('#chartArea').selectAll('*').remove();
        this.currentChart = null;
        
        try {
            // Check if it's user data
            if (dataSource.startsWith('user_')) {
                this.isUserData = true;
                this.fieldMappings = {}; // Reset field mappings
                this.dataLoader.setCurrentDataset(dataSource);
                this.showFieldMappingUI();
                this.updateFieldMappingUI();
            } else {
                this.isUserData = false;
                this.fieldMappings = {}; // Reset field mappings
                this.hideFieldMappingUI();
                this.dataLoader.loadSampleData(dataSource);
            }
        } catch (error) {
            console.error('Error switching data source:', error);
            this.showError('Failed to load data source');
        }
    }/**
     * Create chart based on type
     */    createChart(chartType) {
        const container = '#chartArea'; // Use string selector, not D3 selection
        const data = this.dataLoader.getCurrentData();

        console.log('Creating chart:', chartType, 'with data length:', data.length);
        console.log('isUserData:', this.isUserData);

        // Clear existing chart container
        d3.select(container).selectAll('*').remove();

        if (data.length === 0) {
            console.warn('No data available for chart creation');
            this.showNoDataMessage();
            return;
        }

        const commonOptions = {
            width: 800,
            height: 500,
            animationDuration: 1000,
            showTooltip: true,
            showLegend: true,
            showGrid: true
        };

        try {
            const fieldMapping = this.getSafeFieldMapping(chartType);
            console.log('Field mapping for', chartType, ':', fieldMapping);

            // Validate field mapping before creating chart
            if (!this.validateFieldMappingForChart(chartType, fieldMapping, data)) {
                console.error('Field mapping validation failed');
                return;
            }            // Create chart based on type
            switch (chartType) {
                case 'bar':
                    if (typeof BarChart === 'undefined') {
                        throw new Error('BarChart class not found. Please check if barChart.js is loaded.');
                    }
                    this.currentChart = new BarChart(container, {
                        ...commonOptions,
                        xField: fieldMapping.x,
                        yField: fieldMapping.y,
                        colorField: fieldMapping.color,
                        title: this.getChartTitle('bar'),
                        xAxisLabel: this.getAxisLabel('bar', 'x'),
                        yAxisLabel: this.getAxisLabel('bar', 'y')
                    });
                    break;

                case 'line':
                    if (typeof LineChart === 'undefined') {
                        throw new Error('LineChart class not found. Please check if lineChart.js is loaded.');
                    }
                    this.currentChart = new LineChart(container, {
                        ...commonOptions,
                        xField: fieldMapping.x,
                        yField: fieldMapping.y,
                        groupField: fieldMapping.group,
                        title: this.getChartTitle('line'),
                        xAxisLabel: this.getAxisLabel('line', 'x'),
                        yAxisLabel: this.getAxisLabel('line', 'y'),
                        showDots: true,
                        curveType: 'curveMonotoneX'
                    });
                    break;

                case 'scatter':
                    if (typeof ScatterPlot === 'undefined') {
                        throw new Error('ScatterPlot class not found. Please check if scatterPlot.js is loaded.');
                    }
                    this.currentChart = new ScatterPlot(container, {
                        ...commonOptions,
                        xField: fieldMapping.x,
                        yField: fieldMapping.y,
                        colorField: fieldMapping.color,
                        sizeField: fieldMapping.size,
                        title: this.getChartTitle('scatter'),
                        xAxisLabel: this.getAxisLabel('scatter', 'x'),
                        yAxisLabel: this.getAxisLabel('scatter', 'y'),
                        showRegressionLine: true
                    });
                    break;

                case 'pie':
                    if (typeof PieChart === 'undefined') {
                        throw new Error('PieChart class not found. Please check if pieChart.js is loaded.');
                    }
                    this.currentChart = new PieChart(container, {
                        ...commonOptions,
                        labelField: fieldMapping.label,
                        valueField: fieldMapping.value,
                        title: this.getChartTitle('pie'),
                        showPercentages: true,
                        showLabels: true
                    });
                    break;

                case 'heatmap':
                    if (typeof Heatmap === 'undefined') {
                        throw new Error('Heatmap class not found. Please check if heatmap.js is loaded.');
                    }
                    this.currentChart = new Heatmap(container, {
                        ...commonOptions,
                        xField: fieldMapping.x,
                        yField: fieldMapping.y,
                        valueField: fieldMapping.value,
                        title: this.getChartTitle('heatmap'),
                        xAxisLabel: this.getAxisLabel('heatmap', 'x'),
                        yAxisLabel: this.getAxisLabel('heatmap', 'y'),
                        colorScheme: 'interpolateBlues'
                    });
                    break;

                default:
                    console.error('Unknown chart type:', chartType);
                    this.showError(`Unknown chart type: ${chartType}`);
                    return;
            }

            // Set up chart event handlers
            this.setupChartEventHandlers();

            // Update chart with data
            if (this.currentChart) {
                console.log('Updating chart with data...');
                this.currentChart.updateData(data);
                this.showStatus(`${chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart created successfully!`, 'success');
            }
        } catch (error) {
            console.error('Error creating chart:', error);            this.showError(`Failed to create ${chartType} chart: ${error.message}`);
            this.showNoDataMessage();
        }
    }

    /**
     * Setup chart event handlers
     */
    setupChartEventHandlers() {
        if (!this.currentChart) return;

        // Override selection callbacks
        if (typeof this.currentChart.onBarSelect === 'function') {
            this.currentChart.onBarSelect = (selectedBars, clickedData) => {
                this.onChartSelection('bar', selectedBars, clickedData);
            };
        }

        if (typeof this.currentChart.onDotSelect === 'function') {
            this.currentChart.onDotSelect = (selectedDots, clickedData) => {
                this.onChartSelection('dot', selectedDots, clickedData);
            };
        }

        if (typeof this.currentChart.onBrushSelect === 'function') {
            this.currentChart.onBrushSelect = (...args) => {
                this.onChartBrushSelection(args);
            };
        }
    }

    /**
     * Handle chart selection events
     */
    onChartSelection(type, selectedItems, clickedData) {
        console.log(`Chart selection (${type}):`, selectedItems, clickedData);
        // Update UI based on selection
        this.updateSelectionInfo(selectedItems, clickedData);
    }

    /**
     * Handle chart brush selection events
     */
    onChartBrushSelection(args) {
        console.log('Chart brush selection:', args);
        // Handle brush selection
    }    /**
     * Get field mapping for different chart types and data sources
     */
    getFieldMapping(chartType) {
        // Use user-defined mapping if available
        if (this.isUserData && this.fieldMappings && Object.keys(this.fieldMappings).length > 0) {
            console.log('Using user field mappings:', this.fieldMappings);
            return this.fieldMappings;
        }

        // For sample data, use predefined mappings based on actual field names
        const mappings = {
            sales: {
                bar: { x: 'category', y: 'sales', color: 'region' },
                line: { x: 'date', y: 'sales', group: 'category' },
                scatter: { x: 'quantity', y: 'sales', color: 'category', size: 'profit' },
                pie: { label: 'category', value: 'sales' },
                heatmap: { x: 'category', y: 'region', value: 'sales' }
            },
            temperature: {
                bar: { x: 'city', y: 'temperature', color: 'season' },
                line: { x: 'date', y: 'temperature', group: 'city' },
                scatter: { x: 'temperature', y: 'humidity', color: 'city', size: null },
                pie: { label: 'city', value: 'temperature' },
                heatmap: { x: 'city', y: 'season', value: 'temperature' }
            },
            stocks: {
                bar: { x: 'symbol', y: 'price', color: 'symbol' },
                line: { x: 'date', y: 'price', group: 'symbol' },
                scatter: { x: 'price', y: 'volume', color: 'symbol', size: 'change' },
                pie: { label: 'symbol', value: 'price' },
                heatmap: { x: 'symbol', y: 'month', value: 'price' }
            }
        };

        const mapping = mappings[this.currentDataSource]?.[chartType] || mappings.sales[chartType];
        console.log('Using sample data field mapping for', chartType, ':', mapping);
        return mapping;
    }/**
     * Get chart title based on type and data source
     */
    getChartTitle(chartType) {
        // Use generic titles for user data
        if (this.isUserData) {
            const genericTitles = {
                bar: 'Bar Chart',
                line: 'Line Chart',
                scatter: 'Scatter Plot',
                pie: 'Pie Chart',
                heatmap: 'Heatmap'
            };
            return genericTitles[chartType] || 'Chart';
        }

        const titles = {
            sales: {
                bar: 'Sales by Category',
                line: 'Sales Trends Over Time',
                scatter: 'Sales vs Quantity Analysis',
                pie: 'Sales Distribution by Category',
                heatmap: 'Sales Intensity by Category and Region'
            },
            temperature: {
                bar: 'Average Temperature by City',
                line: 'Temperature Trends Over Time',
                scatter: 'Temperature vs Humidity Correlation',
                pie: 'Temperature Distribution by City',
                heatmap: 'Temperature Patterns by City and Season'
            },
            stocks: {
                bar: 'Stock Prices by Symbol',
                line: 'Stock Price Trends',
                scatter: 'Price vs Volume Analysis',
                pie: 'Portfolio Distribution by Stock',
                heatmap: 'Stock Performance by Symbol and Month'
            }
        };

        return titles[this.currentDataSource]?.[chartType] || `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`;
    }    /**
     * Get axis labels
     */
    getAxisLabel(chartType, axis) {
        // Use field names for user data
        if (this.isUserData && this.fieldMappings) {
            const mapping = this.fieldMappings;
            if (chartType === 'heatmap') {
                if (axis === 'x') return mapping.x || 'X Axis';
                if (axis === 'y') return mapping.y || 'Y Axis';
            } else {
                if (axis === 'x') return mapping.x || 'X Axis';
                if (axis === 'y') return mapping.y || 'Y Axis';
            }
        }

        const labels = {
            sales: {
                bar: { x: 'Product Category', y: 'Sales ($)' },
                line: { x: 'Date', y: 'Sales ($)' },
                scatter: { x: 'Quantity', y: 'Sales ($)' },
                pie: { x: 'Category', y: 'Sales' },
                heatmap: { x: 'Category', y: 'Region' }
            },
            temperature: {
                bar: { x: 'City', y: 'Temperature (°C)' },
                line: { x: 'Date', y: 'Temperature (°C)' },
                scatter: { x: 'Temperature (°C)', y: 'Humidity (%)' },
                pie: { x: 'City', y: 'Temperature' },
                heatmap: { x: 'City', y: 'Season' }
            },
            stocks: {
                bar: { x: 'Stock Symbol', y: 'Price ($)' },
                line: { x: 'Date', y: 'Price ($)' },
                scatter: { x: 'Price ($)', y: 'Volume' },
                pie: { x: 'Symbol', y: 'Price' },
                heatmap: { x: 'Symbol', y: 'Month' }
            }
        };

        return labels[this.currentDataSource]?.[chartType]?.[axis] || `${axis.toUpperCase()} Axis`;
    }

    /**
     * Update chart metadata (title, description)
     */
    updateChartMetadata(chartType) {
        const titleElement = document.getElementById('chartTitle');
        const descriptionElement = document.getElementById('chartDescription');

        if (titleElement) {
            titleElement.textContent = this.getChartTitle(chartType);
        }        if (descriptionElement) {
            const descriptions = {
                bar: 'Compare categorical data with interactive bars',
                line: 'Explore trends over time with connected data points',
                scatter: 'Analyze relationships between two variables',
                pie: 'Show proportional data with interactive slices',
                heatmap: 'Visualize data intensity with color-coded cells'
            };
            descriptionElement.textContent = descriptions[chartType] || 'Interactive data visualization';
        }
    }    /**
     * Update current chart with new data
     */
    updateCurrentChart() {
        const data = this.dataLoader.getCurrentData();
        console.log('Updating current chart with data length:', data.length);
        
        if (!this.currentChart) {
            console.log('No current chart, creating new chart');
            this.createChart(this.currentChartType);
        } else if (typeof this.currentChart.updateData === 'function') {
            console.log('Updating existing chart');
            if (data.length > 0) {
                this.currentChart.updateData(data);
            } else {
                console.warn('No data available for chart update');
                this.showNoDataMessage();
            }
        } else {
            console.error('Current chart does not have updateData method');
            this.createChart(this.currentChartType);
        }
    }

    /**
     * Apply filters to data
     */
    applyFilters() {
        const filters = this.getCurrentFilters();
        this.dataLoader.applyFilters(filters);
    }

    /**
     * Get current filter values from UI
     */
    getCurrentFilters() {
        const filters = {};

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && categoryFilter.selectedOptions.length > 0) {
            filters.category = Array.from(categoryFilter.selectedOptions).map(option => option.value);
        }

        // Date range filter
        const dateRange = document.getElementById('dateRange');
        if (dateRange) {
            const percentage = parseFloat(dateRange.value) / 100;
            const data = this.dataLoader.getRawData();
            
            if (data.length > 0) {
                const dateField = this.dataLoader.findDateColumn(data);
                if (dateField) {
                    const dates = data.map(d => new Date(d[dateField])).sort((a, b) => a - b);
                    const cutoffIndex = Math.floor(dates.length * percentage);
                    
                    if (cutoffIndex > 0 && cutoffIndex < dates.length) {
                        filters[dateField] = { min: dates[0], max: dates[cutoffIndex] };
                        this.updateDateRangeLabels(dates[0], dates[cutoffIndex]);
                    }
                }
            }
        }

        // Value range filter
        const valueRange = document.getElementById('valueRange');
        if (valueRange) {
            const percentage = parseFloat(valueRange.value) / 100;
            const mapping = this.getFieldMapping(this.currentChartType);
            const valueField = mapping.y;
            
            if (valueField) {
                const range = this.dataLoader.getDataRange(valueField);
                const maxValue = range.min + (range.max - range.min) * percentage;
                
                filters[valueField] = { min: range.min, max: maxValue };
                this.updateValueRangeLabels(range.min, maxValue);
            }
        }

        return filters;
    }

    /**
     * Update filter options based on current data
     */
    updateFilterOptions() {
        const data = this.dataLoader.getRawData();
        if (data.length === 0) return;

        // Update category filter options
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            const mapping = this.getFieldMapping(this.currentChartType);
            const categoryField = mapping.color || mapping.x;
            
            if (categoryField) {
                const categories = this.dataLoader.getUniqueValues(categoryField);
                categoryFilter.innerHTML = '';
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categoryFilter.appendChild(option);
                });
            }
        }

        // Update range slider ranges
        this.updateRangeSliders();
    }

    /**
     * Update range sliders
     */
    updateRangeSliders() {
        const data = this.dataLoader.getRawData();
        if (data.length === 0) return;

        // Update date range
        const dateField = this.dataLoader.findDateColumn(data);
        if (dateField) {
            const dates = data.map(d => new Date(d[dateField])).sort((a, b) => a - b);
            this.updateDateRangeLabels(dates[0], dates[dates.length - 1]);
        }

        // Update value range
        const mapping = this.getFieldMapping(this.currentChartType);
        const valueField = mapping.y;
        if (valueField) {
            const range = this.dataLoader.getDataRange(valueField);
            this.updateValueRangeLabels(range.min, range.max);
        }
    }

    /**
     * Update date range labels
     */
    updateDateRangeLabels(startDate, endDate) {
        const startLabel = document.getElementById('dateStart');
        const endLabel = document.getElementById('dateEnd');

        if (startLabel) startLabel.textContent = Utils.formatDate(startDate, 'short');
        if (endLabel) endLabel.textContent = Utils.formatDate(endDate, 'short');
    }

    /**
     * Update value range labels
     */
    updateValueRangeLabels(minValue, maxValue) {
        const minLabel = document.getElementById('valueMin');
        const maxLabel = document.getElementById('valueMax');

        if (minLabel) minLabel.textContent = Utils.formatNumber(minValue);
        if (maxLabel) maxLabel.textContent = Utils.formatNumber(maxValue);
    }

    /**
     * Update data summary
     */
    updateDataSummary() {
        const summary = this.dataLoader.getDataSummary();
        
        // Update summary values
        const totalRecords = document.getElementById('totalRecords');
        const selectedRecords = document.getElementById('selectedRecords');
        const averageValue = document.getElementById('averageValue');

        if (totalRecords) {
            Utils.animateValue(totalRecords, 0, summary.totalRecords, 1000, (val) => Math.floor(val));
        }
        
        if (selectedRecords) {
            Utils.animateValue(selectedRecords, 0, summary.selectedRecords, 1000, (val) => Math.floor(val));
        }
        
        if (averageValue) {
            Utils.animateValue(averageValue, 0, summary.averageValue, 1000, Utils.formatNumber);
        }

        // Update chart statistics
        this.updateChartStatistics();
    }

    /**
     * Update chart statistics
     */
    updateChartStatistics() {
        const data = this.dataLoader.getCurrentData();
        if (data.length === 0) return;

        const mapping = this.getFieldMapping(this.currentChartType);
        const valueField = mapping.y;
        
        if (valueField) {
            const values = data.map(d => d[valueField]).filter(v => !isNaN(v));
            const stats = Utils.calculateStats(values);

            const maxValue = document.getElementById('maxValue');
            const minValue = document.getElementById('minValue');
            const dataPoints = document.getElementById('dataPoints');

            if (maxValue) maxValue.textContent = Utils.formatNumber(stats.max);
            if (minValue) minValue.textContent = Utils.formatNumber(stats.min);
            if (dataPoints) dataPoints.textContent = stats.count;
        }
    }

    /**
     * Update selection info
     */
    updateSelectionInfo(selectedItems, clickedData) {
        // This could update a selection panel or info box
        console.log('Selection info updated:', selectedItems, clickedData);
    }

    /**
     * Show/hide loading spinner
     */
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        const chartContainer = document.getElementById('chartContainer');

        if (spinner && chartContainer) {
            if (show) {
                spinner.classList.remove('hidden');
                chartContainer.style.opacity = '0.5';
            } else {
                spinner.classList.add('hidden');
                chartContainer.style.opacity = '1';
            }
        }
    }    /**
     * Show error message
     */
    showError(message) {
        console.error('Dashboard error:', message);
        this.showStatus(message, 'error');
        
        // Also display error in chart area if no chart is loaded
        if (!this.currentChart) {
            const chartArea = d3.select('#chartArea');
            chartArea.selectAll('*').remove();
            chartArea.append('div')
                .attr('class', 'error-message text-center p-4')
                .style('color', '#dc3545')
                .style('font-size', '16px')
                .html(`<i class="fas fa-exclamation-triangle"></i><br>${message}`);
        }
    }

    /**
     * Show no data message in chart area
     */
    showNoDataMessage() {
        const chartArea = d3.select('#chartArea');
        chartArea.selectAll('*').remove();
        
        const container = chartArea.append('div')
            .attr('class', 'no-data-message text-center p-4')
            .style('color', '#6c757d')
            .style('border', '2px dashed #dee2e6')
            .style('border-radius', '8px')
            .style('margin', '40px')
            .style('background', '#f8f9fa');
            
        container.append('div')
            .style('font-size', '48px')
            .style('margin-bottom', '16px')
            .html('📊');
            
        container.append('h4')
            .style('margin-bottom', '8px')
            .text('No Data Available');
            
        container.append('p')
            .style('margin-bottom', '16px')
            .text('Load a dataset or import your own data to get started.');
            
        container.append('button')
            .attr('class', 'btn btn-primary')
            .text('Load Sample Data')
            .on('click', () => {
                this.dataLoader.loadSampleData('sales');
            });
    }

    /**
     * Clear all selections and filters
     */
    clearAll() {
        // Clear filters
        this.dataLoader.clearFilters();
        
        // Clear chart selections
        if (this.currentChart && typeof this.currentChart.clearSelection === 'function') {
            this.currentChart.clearSelection();
        }

        // Reset UI controls
        this.resetUIControls();
    }

    /**
     * Reset UI controls to default values
     */
    resetUIControls() {
        const dateRange = document.getElementById('dateRange');
        const valueRange = document.getElementById('valueRange');
        const categoryFilter = document.getElementById('categoryFilter');

        if (dateRange) dateRange.value = 100;
        if (valueRange) valueRange.value = 100;
        if (categoryFilter) {
            Array.from(categoryFilter.options).forEach(option => option.selected = false);
        }

        this.updateRangeSliders();
    }

    /**
     * Get dashboard state for saving/restoring
     */
    getState() {
        return {
            currentChartType: this.currentChartType,
            currentDataSource: this.currentDataSource,
            filters: this.dataLoader.filters,
            theme: document.body.getAttribute('data-theme')
        };
    }

    /**
     * Restore dashboard state
     */
    setState(state) {
        if (state.theme) {
            Utils.toggleTheme(state.theme);
        }

        if (state.currentDataSource && state.currentDataSource !== this.currentDataSource) {
            this.switchDataSource(state.currentDataSource);
        }

        if (state.currentChartType && state.currentChartType !== this.currentChartType) {
            const chartTypeSelect = document.getElementById('chartType');
            if (chartTypeSelect) {
                chartTypeSelect.value = state.currentChartType;
            }
            this.switchChart(state.currentChartType);
        }

        if (state.filters) {
            this.dataLoader.applyFilters(state.filters);
        }
    }

    /**
     * Load user data from file
     */
    loadUserData(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const contents = event.target.result;
            try {
                // Assume CSV format for now
                const data = Utils.parseCSV(contents);
                this.dataLoader.loadData(data);
                
                // Auto-detect and apply field mappings
                this.autoMapFields(data[0]);
            } catch (error) {
                console.error('Error loading user data:', error);
                this.showError('Failed to load user data');
            }
        };
        
        reader.readAsText(file);
    }

    /**
     * Auto-map fields based on data sample
     */
    autoMapFields(sample) {
        const mappings = {
            'Product Category': 'category',
            'Sales ($)': 'sales',
            'Date': 'date',
            'Region': 'region',
            'Quantity': 'quantity',
            'Profit': 'profit',
            'City': 'city',
            'Temperature (°C)': 'temperature',
            'Humidity (%)': 'humidity',
            'Stock Symbol': 'symbol',
            'Price ($)': 'price',
            'Volume': 'volume'
        };

        const fields = Object.keys(sample);
        const mappedFields = {};

        fields.forEach(field => {
            const cleanField = field.replace(/[^a-zA-Z0-9 ]/g, '').trim();
            if (mappings[cleanField]) {
                mappedFields[mappings[cleanField]] = field;
            }
        });

        this.fieldMappings = mappedFields;
        this.updateFieldMappingUI(mappedFields);
    }    /**
     * Handle user file import
     */
    async handleFileImport(file) {
        try {
            this.showLoading(true);
            this.showStatus('Loading file...', 'info');

            const datasetName = `user_${Date.now()}`;
            await this.dataLoader.loadUserFile(file, datasetName);
            
            this.isUserData = true;
            this.currentDataSource = datasetName;
            
            // Update data source selector
            this.updateDataSourceSelector(datasetName, file.name);
            
            // Show field mapping UI
            this.showFieldMappingUI();
            
            // Auto-generate field mapping
            this.updateFieldMappingUI();
            
            this.showStatus('File loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error importing file:', error);
            this.showStatus(`Failed to import file: ${error.message}`, 'error');
            this.showLoading(false);
        }
    }

    /**
     * Update data source selector with user data
     */
    updateDataSourceSelector(datasetName, filename) {
        const dataSourceSelect = document.getElementById('dataSource');
        if (!dataSourceSelect) return;

        // Remove existing user data options
        Array.from(dataSourceSelect.options).forEach(option => {
            if (option.value.startsWith('user_')) {
                option.remove();
            }
        });

        // Add new user data option
        const option = document.createElement('option');
        option.value = datasetName;
        option.textContent = `Imported: ${filename}`;
        option.selected = true;
        dataSourceSelect.appendChild(option);
    }    /**
     * Show field mapping UI
     */
    showFieldMappingUI() {
        const fieldMappingSection = document.getElementById('fieldMappingContainer');
        if (fieldMappingSection) {
            fieldMappingSection.style.display = 'block';
        }
    }

    /**
     * Hide field mapping UI
     */
    hideFieldMappingUI() {
        const fieldMappingSection = document.getElementById('fieldMappingContainer');
        if (fieldMappingSection) {
            fieldMappingSection.style.display = 'none';
        }
    }

    /**
     * Update field mapping UI based on current chart type and data
     */
    updateFieldMappingUI() {
        if (!this.isUserData) return;

        const suggestions = this.dataLoader.getFieldSuggestions();
        const smartMapping = this.dataLoader.getSmartFieldMapping(this.currentChartType);
        
        // Clear existing field mapping controls
        const fieldMappingControls = document.getElementById('fieldMappingControls');
        if (!fieldMappingControls) return;

        fieldMappingControls.innerHTML = '';

        // Create field mapping controls based on chart type
        const fieldDefinitions = this.getFieldDefinitionsForChart(this.currentChartType);
        
        fieldDefinitions.forEach(field => {
            const fieldControl = this.createFieldMappingControl(
                field.name, 
                field.label, 
                field.required, 
                suggestions.all,
                smartMapping[field.name]
            );
            fieldMappingControls.appendChild(fieldControl);
        });

        // Store current mapping
        this.fieldMappings = { ...smartMapping };

        // Show validation
        this.validateCurrentMapping();
    }

    /**
     * Get field definitions for different chart types
     */
    getFieldDefinitionsForChart(chartType) {
        const definitions = {
            bar: [
                { name: 'x', label: 'X-Axis (Categories)', required: true },
                { name: 'y', label: 'Y-Axis (Values)', required: true },
                { name: 'color', label: 'Color Grouping', required: false }
            ],
            line: [
                { name: 'x', label: 'X-Axis (Time/Numeric)', required: true },
                { name: 'y', label: 'Y-Axis (Values)', required: true },
                { name: 'group', label: 'Line Grouping', required: false }
            ],
            scatter: [
                { name: 'x', label: 'X-Axis', required: true },
                { name: 'y', label: 'Y-Axis', required: true },
                { name: 'color', label: 'Color Grouping', required: false },
                { name: 'size', label: 'Size Mapping', required: false }
            ],
            pie: [
                { name: 'label', label: 'Categories', required: true },
                { name: 'value', label: 'Values', required: true }
            ],
            heatmap: [
                { name: 'x', label: 'X-Axis (Categories)', required: true },
                { name: 'y', label: 'Y-Axis (Categories)', required: true },
                { name: 'value', label: 'Values (Intensity)', required: true }
            ]
        };

        return definitions[chartType] || definitions.bar;
    }

    /**
     * Create field mapping control element
     */
    createFieldMappingControl(fieldName, label, required, availableFields, selectedField) {
        const container = document.createElement('div');
        container.className = 'form-group mb-3';

        const labelElement = document.createElement('label');
        labelElement.className = 'form-label';
        labelElement.textContent = label + (required ? ' *' : '');
        labelElement.setAttribute('for', `field_${fieldName}`);        const select = document.createElement('select');
        select.className = 'form-select';
        select.id = `field_${fieldName}`;
        select.setAttribute('data-field', fieldName); // Use setAttribute instead of dataset

        // Add empty option for non-required fields
        if (!required) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- None --';
            select.appendChild(emptyOption);
        }

        // Add available field options
        availableFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field;
            option.textContent = field;
            if (field === selectedField) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Add change listener
        select.addEventListener('change', (e) => {
            this.fieldMappings[fieldName] = e.target.value || null;
            this.validateCurrentMapping();
        });

        container.appendChild(labelElement);
        container.appendChild(select);

        return container;
    }

    /**
     * Validate current field mapping
     */
    validateCurrentMapping() {
        const validation = this.dataLoader.validateFieldMapping(
            this.currentChartType, 
            this.fieldMappings
        );

        // Update validation UI
        const validationContainer = document.getElementById('mappingValidation');
        if (!validationContainer) return;

        validationContainer.innerHTML = '';

        if (validation.errors.length > 0) {
            const errorList = document.createElement('div');
            errorList.className = 'alert alert-danger';
            errorList.innerHTML = '<strong>Errors:</strong><ul>' + 
                validation.errors.map(error => `<li>${error}</li>`).join('') + 
                '</ul>';
            validationContainer.appendChild(errorList);
        }

        if (validation.warnings.length > 0) {
            const warningList = document.createElement('div');
            warningList.className = 'alert alert-warning';
            warningList.innerHTML = '<strong>Warnings:</strong><ul>' + 
                validation.warnings.map(warning => `<li>${warning}</li>`).join('') + 
                '</ul>';
            validationContainer.appendChild(warningList);
        }

        if (validation.isValid && validation.errors.length === 0) {
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success';
            successMessage.textContent = 'Field mapping is valid!';
            validationContainer.appendChild(successMessage);
        }

        // Enable/disable apply button
        const applyBtn = document.getElementById('applyMapping');
        if (applyBtn) {
            applyBtn.disabled = !validation.isValid;
        }
    }    /**
     * Apply current field mapping and update chart
     */
    applyFieldMapping() {
        if (!this.isUserData) {
            console.log('Not user data, skipping field mapping application');
            return;
        }

        // Collect field mappings from UI
        const fieldMappingControls = document.getElementById('fieldMappingControls');
        if (!fieldMappingControls) {
            console.error('Field mapping controls not found');
            return;
        }

        const mappings = {};
        const selects = fieldMappingControls.querySelectorAll('select');
        selects.forEach(select => {
            const fieldName = select.getAttribute('data-field');
            const selectedValue = select.value;
            if (fieldName && selectedValue && selectedValue !== '') {
                mappings[fieldName] = selectedValue;
            }
        });

        console.log('Collected field mappings:', mappings);
        this.fieldMappings = mappings;

        // Validate the mapping
        const validation = this.dataLoader.validateFieldMapping(
            this.currentChartType, 
            this.fieldMappings
        );

        if (!validation.isValid) {
            console.error('Field mapping validation failed:', validation.errors);
            this.showStatus('Please fix field mapping errors: ' + validation.errors.join(', '), 'error');
            return;
        }

        // Create or update chart with new mapping
        console.log('Creating chart with field mapping:', this.fieldMappings);
        this.createChart(this.currentChartType);
        this.showStatus('Field mapping applied successfully!', 'success');
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        // Create or update status display
        let statusContainer = document.getElementById('statusContainer');
        if (!statusContainer) {
            statusContainer = document.createElement('div');
            statusContainer.id = 'statusContainer';
            statusContainer.className = 'position-fixed top-0 end-0 p-3';
            statusContainer.style.zIndex = '1050';
            document.body.appendChild(statusContainer);
        }

        const alert = document.createElement('div');
        alert.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        statusContainer.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }    /**
     * Get safe field mapping (handles null/undefined values)
     */
    getSafeFieldMapping(chartType) {
        const mapping = this.getFieldMapping(chartType);
        const safeMapping = {};
        
        console.log('Raw field mapping for', chartType, ':', mapping);
        console.log('Current isUserData:', this.isUserData);
        console.log('Current fieldMappings:', this.fieldMappings);
        
        // Ensure all required fields have values
        if (mapping && typeof mapping === 'object') {
            Object.keys(mapping).forEach(key => {
                if (mapping[key] && mapping[key] !== '' && mapping[key] !== null) {
                    safeMapping[key] = mapping[key];
                }
            });
        }
        
        console.log('Safe field mapping for', chartType, ':', safeMapping);
        return safeMapping;
    }    /**
     * Validate field mapping for chart creation
     */
    validateFieldMappingForChart(chartType, fieldMapping, data) {
        if (!fieldMapping || typeof fieldMapping !== 'object') {
            console.error('Invalid field mapping object');
            this.showError('Invalid field mapping configuration');
            return false;
        }

        if (data.length === 0) {
            console.error('No data available for validation');
            this.showError('No data available for chart creation');
            return false;
        }

        // Get the first data record to check available fields
        const sampleRecord = data[0];
        const availableFields = Object.keys(sampleRecord);
        console.log('Available fields in data:', availableFields);

        // Define required fields for each chart type
        const requiredFields = {
            bar: ['x', 'y'],
            line: ['x', 'y'],
            scatter: ['x', 'y'],
            pie: ['label', 'value'],
            heatmap: ['x', 'y', 'value']
        };

        const required = requiredFields[chartType] || ['x', 'y'];
        console.log('Required fields for', chartType, ':', required);

        // Check if all required fields are present and valid
        for (const field of required) {
            const fieldName = fieldMapping[field];
            if (!fieldName) {
                console.error(`Missing required field '${field}' for ${chartType} chart`);
                this.showError(`${chartType} chart requires ${field} field to be mapped`);
                return false;
            }

            if (!availableFields.includes(fieldName)) {
                console.error(`Field '${fieldName}' not found in data. Available fields: ${availableFields.join(', ')}`);
                this.showError(`Field '${fieldName}' does not exist in the dataset. Available fields: ${availableFields.join(', ')}`);
                return false;
            }
        }

        console.log('Field mapping validation passed for', chartType);
        return true;
    }

    // ...existing code...
}

// ================================================
// APPLICATION INITIALIZATION
// ================================================

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Data Visualization Dashboard...');
    
    // Create global dashboard instance
    window.dashboard = new Dashboard();
    
    console.log('Dashboard initialized successfully!');
    
    // Add global keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Ctrl+R: Reset all filters and selections
        if (event.ctrlKey && event.key === 'r') {
            event.preventDefault();
            window.dashboard.clearAll();
        }
        
        // Ctrl+E: Export current chart as PNG
        if (event.ctrlKey && event.key === 'e') {
            event.preventDefault();
            Utils.exportToPNG('#mainChart', `chart-${Date.now()}.png`);
        }
    });
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard && window.dashboard.currentChart) {
        if (typeof window.dashboard.currentChart.destroy === 'function') {
            window.dashboard.currentChart.destroy();
        }
    }
});
