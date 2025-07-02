# 📊 Interactive Data Visualization Dashboard

A powerful, modular web-based data visualization application built with D3.js that allows users to create interactive charts from their own data or sample datasets.

![Dashboard Preview](https://img.shields.io/badge/Status-Complete-success)
![D3.js](https://img.shields.io/badge/D3.js-v7-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![HTML5](https://img.shields.io/badge/HTML5-semantic-blue)
![CSS3](https://img.shields.io/badge/CSS3-responsive-blue)

## ✨ Features

### 🎯 Core Functionality
- **5 Interactive Chart Types**: Bar charts, line charts, scatter plots, pie charts, and heatmaps
- **Dynamic Data Import**: Load your own CSV or JSON files with automatic type detection
- **Smart Field Mapping**: Automatic field suggestion and manual mapping for any dataset
- **Real-time Filtering**: Interactive filters for dates, values, and categories
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Theme Support**: Light and dark themes with smooth transitions

### 📁 Data Management
- **Multiple Data Sources**: Switch between sample datasets or imported data
- **File Format Support**: CSV and JSON file import with validation
- **Automatic Type Detection**: Smart parsing of numbers, dates, and text
- **Data Validation**: Field mapping validation with helpful error messages
- **Export Capabilities**: Export charts as PNG/SVG and data as CSV

### 🎨 Interactive Features
- **Zoom & Pan**: Navigate through large datasets with mouse/touch
- **Tooltips**: Rich, contextual information on hover
- **Selection**: Click to select data points and view details
- **Brush Selection**: Select ranges of data for filtering
- **Animations**: Smooth transitions between data updates
- **Keyboard Shortcuts**: Quick actions with keyboard commands

### 📊 Chart Types

1. **Bar Chart**
   - Compare categorical data
   - Interactive bars with tooltips
   - Color grouping support
   - Responsive scaling

2. **Line Chart**
   - Time series and trend analysis
   - Multiple series support
   - Smooth curve interpolation
   - Zoom and pan functionality

3. **Scatter Plot**
   - Correlation analysis
   - Size and color mapping
   - Regression line overlay
   - Brush selection

4. **Pie Chart**
   - Proportional data visualization
   - Interactive slices
   - Percentage labels
   - Legend support

5. **Heatmap**
   - Matrix data visualization
   - Color intensity mapping
   - Category correlation
   - Custom color schemes

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd data-visualization-dashboard
```

### 2. Start Development Server
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have live-server)
npx live-server --port=8000
```

### 3. Open in Browser
Navigate to `http://localhost:8000` in your web browser.

## 📖 How to Use

### Using Sample Data
1. Select a chart type from the dropdown
2. Choose a sample dataset (Sales, Temperature, or Stocks)
3. Apply filters using the sidebar controls
4. Interact with the chart (hover, click, zoom)
5. Export your visualization

### Importing Your Own Data

#### CSV Files
1. Click "Choose File" in the sidebar
2. Select a CSV file from your computer
3. The app will automatically detect data types
4. Use the Field Mapping section to assign fields to chart axes
5. Click "Apply Mapping" to update the chart

#### JSON Files
1. Click "Choose File" and select a JSON file
2. Ensure your JSON is an array of objects or has a `data` property
3. Map fields to chart axes in the Field Mapping section
4. Apply the mapping to visualize your data

#### Data Format Examples

**CSV Format:**
```csv
name,age,salary,department
John Doe,28,65000,Engineering
Jane Smith,32,75000,Marketing
Bob Johnson,45,90000,Engineering
```

**JSON Format:**
```json
[
  {
    "name": "John Doe",
    "age": 28,
    "salary": 65000,
    "department": "Engineering"
  },
  {
    "name": "Jane Smith", 
    "age": 32,
    "salary": 75000,
    "department": "Marketing"
  }
]
```

### Field Mapping
When you import data, the app provides smart suggestions for field mapping:

- **Bar Charts**: X-axis (categories), Y-axis (values), Color grouping
- **Line Charts**: X-axis (time/numeric), Y-axis (values), Line grouping  
- **Scatter Plots**: X-axis (numeric), Y-axis (numeric), Color/Size mapping
- **Pie Charts**: Categories (labels), Values (numeric)
- **Heatmaps**: X-axis (categories), Y-axis (categories), Values (intensity)

## 🎨 Customization

### Themes
- Toggle between light and dark themes using the theme button
- Themes persist across browser sessions
- Smooth color transitions

### Chart Options
Each chart type supports various customization options:
- Colors and color schemes
- Animation duration
- Grid display
- Legend positioning
- Tooltip formatting

### Responsive Behavior
- Charts automatically resize based on screen size
- Mobile-optimized touch interactions
- Collapsible sidebar on small screens

## ⌨️ Keyboard Shortcuts

- `Ctrl + R`: Reset all filters and selections
- `Ctrl + E`: Export current chart as PNG
- `Ctrl + T`: Toggle theme (if implemented)

## 🏗️ Architecture

### Modular Design
The application follows a modular architecture with separate classes for each component:

```
js/
├── main.js          # Main application logic and dashboard management
├── dataLoader.js    # Data loading, processing, and validation
├── utils.js         # Utility functions and helpers
├── barChart.js      # Bar chart implementation
├── lineChart.js     # Line chart implementation
├── scatterPlot.js   # Scatter plot implementation
├── pieChart.js      # Pie chart implementation
└── heatmap.js       # Heatmap implementation
```

### Key Classes

- **Dashboard**: Main application controller
- **DataLoader**: Handles data import, processing, and filtering
- **Chart Classes**: Individual chart implementations with D3.js
- **Utils**: Shared utilities for formatting, themes, and exports

## 🔧 Technical Details

### Dependencies
- **D3.js v7**: Data visualization and DOM manipulation
- **Bootstrap 5**: UI components and responsive grid
- **Modern JavaScript**: ES6+ features and modules

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Performance
- Efficient data filtering with debounced updates
- Optimized rendering for large datasets
- Memory management with proper cleanup
- Smooth animations with requestAnimationFrame

## 📁 Project Structure

```
data-visualization-dashboard/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # Custom styles and themes
├── js/
│   ├── main.js            # Application core
│   ├── dataLoader.js      # Data management
│   ├── utils.js           # Utilities
│   ├── barChart.js        # Bar chart
│   ├── lineChart.js       # Line chart
│   ├── scatterPlot.js     # Scatter plot
│   ├── pieChart.js        # Pie chart
│   └── heatmap.js         # Heatmap
├── data/
│   ├── sales_data.csv     # Sample sales data
│   ├── temperature_data.json # Sample temperature data
│   ├── employees.csv      # Sample employee data
│   └── products.json      # Sample product data
├── package.json           # Project metadata
└── README.md             # Documentation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ES6+ JavaScript features
- Follow D3.js best practices
- Write descriptive comments
- Maintain responsive design
- Ensure accessibility compliance

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **D3.js Community**: For the amazing visualization library
- **Bootstrap Team**: For the responsive framework
- **Sample Data**: Generated for demonstration purposes

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](issues) section
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce

---

**Built with ❤️ using D3.js, HTML5, CSS3, and JavaScript**
