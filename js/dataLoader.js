// ================================================
// DATA LOADER MODULE FOR DATA VISUALIZATION
// ================================================

/**
 * DataLoader class for loading and managing datasets
 */
class DataLoader {
    constructor() {
        this.datasets = new Map();
        this.currentDataset = null;
        this.filters = {};
        this.callbacks = {
            onDataLoad: [],
            onDataChange: [],
            onError: []
        };
    }

    /**
     * Register event callbacks
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    /**
     * Trigger event callbacks
     * @param {string} event - Event name
     * @param {*} data - Data to pass to callbacks
     */
    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }

    /**
     * Load CSV data from file
     * @param {string} filePath - Path to CSV file
     * @param {string} datasetName - Name for the dataset
     * @param {Object} options - Parsing options
     * @returns {Promise} Promise resolving to loaded data
     */
    async loadCSV(filePath, datasetName, options = {}) {
        try {
            const data = await d3.csv(filePath, (d) => {
                // Auto-detect and convert data types
                const row = {};
                Object.keys(d).forEach(key => {
                    const value = d[key];
                    
                    // Try to parse as number
                    if (!isNaN(value) && !isNaN(parseFloat(value)) && value.trim() !== '') {
                        row[key] = parseFloat(value);
                    }
                    // Try to parse as date
                    else if (this.isDateString(value)) {
                        row[key] = new Date(value);
                    }
                    // Keep as string
                    else {
                        row[key] = value;
                    }
                });
                
                return row;
            });            const processedData = this.processData(data, options);
            this.datasets.set(datasetName, processedData);
            this.currentDataset = datasetName;
            
            this.trigger('onDataLoad', { name: datasetName, data: processedData, isUserData: false });
            return processedData;
            
        } catch (error) {
            console.error('Error loading CSV:', error);
            this.trigger('onError', { type: 'load', error, filePath });
            throw error;
        }
    }

    /**
     * Load JSON data from file
     * @param {string} filePath - Path to JSON file
     * @param {string} datasetName - Name for the dataset
     * @param {Object} options - Processing options
     * @returns {Promise} Promise resolving to loaded data
     */
    async loadJSON(filePath, datasetName, options = {}) {
        try {
            const data = await d3.json(filePath);
            
            // If data is not an array, try to extract array from common structures
            let arrayData = Array.isArray(data) ? data : 
                           data.data ? data.data :
                           data.results ? data.results :
                           [data];            const processedData = this.processData(arrayData, options);
            this.datasets.set(datasetName, processedData);
            this.currentDataset = datasetName;
            
            this.trigger('onDataLoad', { name: datasetName, data: processedData, isUserData: false });
            return processedData;
            
        } catch (error) {
            console.error('Error loading JSON:', error);
            this.trigger('onError', { type: 'load', error, filePath });
            throw error;
        }
    }    /**
     * Load predefined sample data
     * @param {string} datasetName - Name of sample dataset
     * @returns {Array} Sample data
     */    loadSampleData(datasetName = 'sales') {
        console.log('Loading sample data:', datasetName);
        const sampleDatasets = {
            sales: this.generateSalesData(),
            temperature: this.generateTemperatureData(),
            stocks: this.generateStockData()
        };

        const data = sampleDatasets[datasetName] || sampleDatasets.sales;
        console.log('Generated sample data length:', data.length);
        this.datasets.set(datasetName, data);
        this.currentDataset = datasetName;
        
        this.trigger('onDataLoad', { 
            name: datasetName, 
            data,
            isUserData: false 
        });
        return data;
    }

    /**
     * Load data from user-uploaded file
     * @param {File} file - File object from input
     * @param {string} datasetName - Name for the dataset
     * @param {Object} options - Processing options
     * @returns {Promise} Promise resolving to loaded data
     */
    async loadUserFile(file, datasetName, options = {}) {
        try {
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.csv')) {
                return await this.loadUserCSV(file, datasetName, options);
            } else if (fileName.endsWith('.json')) {
                return await this.loadUserJSON(file, datasetName, options);
            } else {
                throw new Error('Unsupported file format. Please upload CSV or JSON files.');
            }
        } catch (error) {
            console.error('Error loading user file:', error);
            this.trigger('onError', { type: 'userFile', error, file: file.name });
            throw error;
        }
    }

    /**
     * Load CSV file from user input
     * @param {File} file - CSV file object
     * @param {string} datasetName - Name for the dataset
     * @param {Object} options - Processing options
     * @returns {Promise} Promise resolving to loaded data
     */
    async loadUserCSV(file, datasetName, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const data = d3.csvParse(csvText, (d) => {
                        // Auto-detect and convert data types
                        const row = {};
                        Object.keys(d).forEach(key => {
                            const value = d[key];
                            
                            // Skip empty values
                            if (!value || value.trim() === '') {
                                row[key] = null;
                                return;
                            }
                            
                            // Try to parse as number
                            if (!isNaN(value) && !isNaN(parseFloat(value))) {
                                row[key] = parseFloat(value);
                            }
                            // Try to parse as date
                            else if (this.isDateString(value)) {
                                row[key] = new Date(value);
                            }
                            // Keep as string
                            else {
                                row[key] = value.trim();
                            }
                        });
                        
                        return row;
                    });

                    const processedData = this.processData(data, options);
                    this.datasets.set(datasetName, processedData);
                    this.currentDataset = datasetName;
                    
                    this.trigger('onDataLoad', { 
                        name: datasetName, 
                        data: processedData,
                        isUserData: true,
                        filename: file.name
                    });
                    
                    resolve(processedData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Load JSON file from user input
     * @param {File} file - JSON file object
     * @param {string} datasetName - Name for the dataset
     * @param {Object} options - Processing options
     * @returns {Promise} Promise resolving to loaded data
     */
    async loadUserJSON(file, datasetName, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const jsonText = e.target.result;
                    const data = JSON.parse(jsonText);
                    
                    // If data is not an array, try to extract array from common structures
                    let arrayData = Array.isArray(data) ? data : 
                                   data.data ? data.data :
                                   data.results ? data.results :
                                   data.items ? data.items :
                                   [data];

                    // Auto-convert data types
                    arrayData = arrayData.map(row => {
                        const convertedRow = {};
                        Object.keys(row).forEach(key => {
                            const value = row[key];
                            
                            if (value === null || value === undefined) {
                                convertedRow[key] = null;
                            } else if (typeof value === 'string') {
                                // Try to parse as number
                                if (!isNaN(value) && !isNaN(parseFloat(value)) && value.trim() !== '') {
                                    convertedRow[key] = parseFloat(value);
                                }
                                // Try to parse as date
                                else if (this.isDateString(value)) {
                                    convertedRow[key] = new Date(value);
                                }
                                // Keep as string
                                else {
                                    convertedRow[key] = value;
                                }
                            } else {
                                convertedRow[key] = value;
                            }
                        });
                        return convertedRow;
                    });

                    const processedData = this.processData(arrayData, options);
                    this.datasets.set(datasetName, processedData);
                    this.currentDataset = datasetName;
                    
                    this.trigger('onDataLoad', { 
                        name: datasetName, 
                        data: processedData,
                        isUserData: true,
                        filename: file.name
                    });
                    
                    resolve(processedData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Get current dataset with filters applied
     * @returns {Array} Filtered current dataset
     */
    getCurrentData() {
        if (!this.currentDataset || !this.datasets.has(this.currentDataset)) {
            return [];
        }

        const data = this.datasets.get(this.currentDataset);
        return Utils.filterData(data, this.filters);
    }

    /**
     * Get raw dataset without filters
     * @param {string} datasetName - Name of dataset (optional, uses current if not provided)
     * @returns {Array} Raw dataset
     */
    getRawData(datasetName) {
        const name = datasetName || this.currentDataset;
        return this.datasets.get(name) || [];
    }

    /**
     * Set current dataset
     * @param {string} datasetName - Name of dataset to set as current
     */
    setCurrentDataset(datasetName) {
        if (this.datasets.has(datasetName)) {
            this.currentDataset = datasetName;
            this.trigger('onDataChange', { name: datasetName, data: this.getCurrentData() });
        }
    }

    /**
     * Apply filters to current dataset
     * @param {Object} newFilters - Filter criteria
     */
    applyFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.trigger('onDataChange', { 
            name: this.currentDataset, 
            data: this.getCurrentData(),
            filters: this.filters 
        });
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {};
        this.trigger('onDataChange', { 
            name: this.currentDataset, 
            data: this.getCurrentData(),
            filters: this.filters 
        });
    }

    /**
     * Get unique values for a column
     * @param {string} column - Column name
     * @param {string} datasetName - Dataset name (optional)
     * @returns {Array} Array of unique values
     */
    getUniqueValues(column, datasetName) {
        const data = this.getRawData(datasetName);
        const values = data.map(d => d[column]).filter(v => v !== null && v !== undefined);
        return [...new Set(values)].sort();
    }

    /**
     * Get data range for a numeric column
     * @param {string} column - Column name
     * @param {string} datasetName - Dataset name (optional)
     * @returns {Object} Object with min and max values
     */
    getDataRange(column, datasetName) {
        const data = this.getRawData(datasetName);
        const values = data.map(d => d[column]).filter(v => !isNaN(v) && v !== null && v !== undefined);
        
        if (values.length === 0) return { min: 0, max: 100 };
        
        return {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }

    /**
     * Get column information
     * @param {string} datasetName - Dataset name (optional)
     * @returns {Object} Column information
     */
    getColumnInfo(datasetName) {
        const data = this.getRawData(datasetName);
        if (data.length === 0) return {};

        const columns = Object.keys(data[0]);
        const info = {};

        columns.forEach(col => {
            const values = data.map(d => d[col]).filter(v => v !== null && v !== undefined);
            const sampleValue = values[0];
            
            info[col] = {
                name: col,
                type: typeof sampleValue === 'number' ? 'numeric' : 
                      sampleValue instanceof Date ? 'date' : 'categorical',
                uniqueCount: new Set(values).size,
                sampleValues: values.slice(0, 5)
            };
            
            if (info[col].type === 'numeric') {
                const stats = Utils.calculateStats(values);
                info[col] = { ...info[col], ...stats };
            }
        });

        return info;
    }

    /**
     * Process and clean data
     * @param {Array} data - Raw data array
     * @param {Object} options - Processing options
     * @returns {Array} Processed data
     */
    processData(data, options = {}) {
        if (!Array.isArray(data)) return [];

        let processed = data.slice(); // Create copy

        // Remove rows with too many null values
        if (options.removeIncompleteRows) {
            const threshold = options.nullThreshold || 0.5;
            processed = processed.filter(row => {
                const keys = Object.keys(row);
                const nullCount = keys.filter(key => 
                    row[key] === null || row[key] === undefined || row[key] === ''
                ).length;
                return (nullCount / keys.length) < threshold;
            });
        }

        // Sort by date if date column exists
        if (options.sortByDate) {
            const dateColumn = this.findDateColumn(processed);
            if (dateColumn) {
                processed.sort((a, b) => new Date(a[dateColumn]) - new Date(b[dateColumn]));
            }
        }

        return processed;
    }

    /**
     * Check if string is a valid date
     * @param {string} str - String to check
     * @returns {boolean} True if valid date string
     */
    isDateString(str) {
        if (!str || typeof str !== 'string') return false;
        
        // Common date patterns
        const datePatterns = [
            /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
            /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
            /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
            /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
        ];

        return datePatterns.some(pattern => pattern.test(str)) && !isNaN(Date.parse(str));
    }

    /**
     * Find date column in data
     * @param {Array} data - Data array
     * @returns {string|null} Date column name or null
     */
    findDateColumn(data) {
        if (data.length === 0) return null;
        
        const columns = Object.keys(data[0]);
        return columns.find(col => {
            const value = data[0][col];
            return value instanceof Date || this.isDateString(value);
        }) || null;
    }

    /**
     * Generate sample sales data
     * @returns {Array} Sample sales data
     */
    generateSalesData() {
        const categories = ['Electronics', 'Clothing', 'Books', 'Food', 'Sports'];
        const regions = ['North', 'South', 'East', 'West'];
        const data = [];

        for (let i = 0; i < 100; i++) {
            const date = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            data.push({
                id: i + 1,
                date: date,
                sales: Math.floor(Math.random() * 10000) + 1000,
                quantity: Math.floor(Math.random() * 100) + 1,
                category: categories[Math.floor(Math.random() * categories.length)],
                region: regions[Math.floor(Math.random() * regions.length)],
                profit: Math.floor(Math.random() * 3000) + 200,
                month: date.toLocaleString('default', { month: 'long' }),
                quarter: `Q${Math.ceil((date.getMonth() + 1) / 3)}`
            });
        }

        return data.sort((a, b) => a.date - b.date);
    }

    /**
     * Generate sample temperature data
     * @returns {Array} Sample temperature data
     */
    generateTemperatureData() {
        const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
        const data = [];

        for (let i = 0; i < 365; i++) {
            const date = new Date(2023, 0, 1 + i);
            const baseTemp = 20 + 15 * Math.sin((i / 365) * 2 * Math.PI); // Seasonal variation
            
            cities.forEach(city => {
                const cityOffset = cities.indexOf(city) * 5; // Different base temps
                const temp = baseTemp + cityOffset + (Math.random() - 0.5) * 10;
                
                data.push({
                    date: date,
                    temperature: Math.round(temp * 10) / 10,
                    humidity: Math.floor(Math.random() * 40) + 40,
                    city: city,
                    month: date.toLocaleString('default', { month: 'long' }),
                    season: this.getSeason(date.getMonth())
                });
            });
        }

        return data.sort((a, b) => a.date - b.date);
    }

    /**
     * Generate sample stock data
     * @returns {Array} Sample stock data
     */
    generateStockData() {
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
        const basePrices = { AAPL: 150, GOOGL: 2500, MSFT: 300, AMZN: 3200, TSLA: 800 };
        const data = [];

        for (let i = 0; i < 90; i++) {
            const date = new Date(2023, 9, 1 + i); // Last 3 months
            
            symbols.forEach(symbol => {
                const basePrice = basePrices[symbol];
                const change = (Math.random() - 0.5) * 0.05; // ±5% daily change
                const price = basePrice * (1 + change);
                
                data.push({
                    date: date,
                    symbol: symbol,
                    price: Math.round(price * 100) / 100,
                    volume: Math.floor(Math.random() * 5000000) + 1000000,
                    change: Math.round(change * 10000) / 100, // Percentage change
                    month: date.toLocaleString('default', { month: 'long' })
                });
            });
        }

        return data.sort((a, b) => a.date - b.date);
    }

    /**
     * Get season from month number
     * @param {number} month - Month number (0-11)
     * @returns {string} Season name
     */
    getSeason(month) {
        if (month >= 2 && month <= 4) return 'Spring';
        if (month >= 5 && month <= 7) return 'Summer';
        if (month >= 8 && month <= 10) return 'Fall';
        return 'Winter';
    }

    /**
     * Export current data as CSV
     * @param {string} filename - Output filename
     */
    exportToCSV(filename = 'data.csv') {
        const data = this.getCurrentData();
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (value instanceof Date) {
                        return value.toISOString().split('T')[0];
                    }
                    return typeof value === 'string' && value.includes(',') ? 
                           `"${value}"` : value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Get data summary statistics
     * @returns {Object} Summary statistics
     */
    getDataSummary() {
        const data = this.getCurrentData();
        const rawData = this.getRawData();
        
        if (data.length === 0) {
            return {
                totalRecords: 0,
                selectedRecords: 0,
                averageValue: 0,
                columns: []
            };
        }

        // Find numeric columns
        const numericColumns = Object.keys(data[0]).filter(key => 
            typeof data[0][key] === 'number'
        );

        let averageValue = 0;
        if (numericColumns.length > 0) {
            const firstNumCol = numericColumns[0];
            const values = data.map(d => d[firstNumCol]).filter(v => !isNaN(v));
            averageValue = values.length > 0 ? 
                          values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        }

        return {
            totalRecords: rawData.length,
            selectedRecords: data.length,
            averageValue: Math.round(averageValue * 100) / 100,
            columns: Object.keys(data[0] || {}),
            numericColumns,
            hasFilters: Object.keys(this.filters).length > 0
        };
    }

    /**
     * Get field suggestions for chart mapping
     * @param {string} datasetName - Dataset name (optional)
     * @returns {Object} Field suggestions by type
     */
    getFieldSuggestions(datasetName) {
        const data = this.getRawData(datasetName);
        if (data.length === 0) return {};

        const columns = Object.keys(data[0]);
        const suggestions = {
            numeric: [],
            categorical: [],
            date: [],
            all: columns
        };

        columns.forEach(col => {
            const values = data.map(d => d[col]).filter(v => v !== null && v !== undefined);
            const sampleValue = values[0];
            
            if (typeof sampleValue === 'number') {
                suggestions.numeric.push(col);
            } else if (sampleValue instanceof Date || this.isDateString(sampleValue)) {
                suggestions.date.push(col);
            } else {
                suggestions.categorical.push(col);
            }
        });

        return suggestions;
    }

    /**
     * Get smart field mappings for different chart types
     * @param {string} chartType - Type of chart
     * @param {string} datasetName - Dataset name (optional)
     * @returns {Object} Suggested field mappings
     */
    getSmartFieldMapping(chartType, datasetName) {
        const suggestions = this.getFieldSuggestions(datasetName);
        const mappings = {};

        switch (chartType) {
            case 'bar':
                mappings.x = suggestions.categorical[0] || suggestions.all[0];
                mappings.y = suggestions.numeric[0] || suggestions.all[1];
                break;
                
            case 'line':
                mappings.x = suggestions.date[0] || suggestions.numeric[0] || suggestions.all[0];
                mappings.y = suggestions.numeric[0] || suggestions.all[1];
                break;
                
            case 'scatter':
                mappings.x = suggestions.numeric[0] || suggestions.all[0];
                mappings.y = suggestions.numeric[1] || suggestions.all[1];
                mappings.size = suggestions.numeric[2] || null;
                mappings.color = suggestions.categorical[0] || null;
                break;
                
            case 'pie':
                mappings.label = suggestions.categorical[0] || suggestions.all[0];
                mappings.value = suggestions.numeric[0] || suggestions.all[1];
                break;
                
            case 'heatmap':
                mappings.x = suggestions.categorical[0] || suggestions.all[0];
                mappings.y = suggestions.categorical[1] || suggestions.all[1];
                mappings.value = suggestions.numeric[0] || suggestions.all[2];
                break;
                
            default:
                mappings.x = suggestions.all[0];
                mappings.y = suggestions.all[1];
        }

        return mappings;
    }

    /**
     * Validate field mapping for chart type
     * @param {string} chartType - Type of chart
     * @param {Object} mapping - Field mapping object
     * @param {string} datasetName - Dataset name (optional)
     * @returns {Object} Validation result
     */
    validateFieldMapping(chartType, mapping, datasetName) {
        const suggestions = this.getFieldSuggestions(datasetName);
        const errors = [];
        const warnings = [];

        const checkField = (field, requiredTypes, fieldName) => {
            if (!field) {
                errors.push(`${fieldName} field is required for ${chartType} chart`);
                return;
            }

            if (!suggestions.all.includes(field)) {
                errors.push(`Field '${field}' does not exist in dataset`);
                return;
            }

            const fieldType = suggestions.numeric.includes(field) ? 'numeric' :
                             suggestions.date.includes(field) ? 'date' :
                             'categorical';

            if (requiredTypes && !requiredTypes.includes(fieldType)) {
                warnings.push(`Field '${field}' is ${fieldType}, but ${requiredTypes.join(' or ')} is recommended for ${fieldName}`);
            }
        };

        switch (chartType) {
            case 'bar':
                checkField(mapping.x, ['categorical'], 'X-axis');
                checkField(mapping.y, ['numeric'], 'Y-axis');
                break;
                
            case 'line':
                checkField(mapping.x, ['date', 'numeric'], 'X-axis');
                checkField(mapping.y, ['numeric'], 'Y-axis');
                break;
                
            case 'scatter':
                checkField(mapping.x, ['numeric'], 'X-axis');
                checkField(mapping.y, ['numeric'], 'Y-axis');
                break;
                
            case 'pie':
                checkField(mapping.label, ['categorical'], 'Label');
                checkField(mapping.value, ['numeric'], 'Value');
                break;
                
            case 'heatmap':
                checkField(mapping.x, ['categorical'], 'X-axis');
                checkField(mapping.y, ['categorical'], 'Y-axis');
                checkField(mapping.value, ['numeric'], 'Value');
                break;
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions: this.getSmartFieldMapping(chartType, datasetName)
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}
