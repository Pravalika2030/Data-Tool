const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const csvParser = require('csv-parser');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Helper function to calculate sum, mean, median, and mode
function calculateSumMeanMedianMode(data) {
    const stats = {};
    const numericColumns = Object.keys(data[0]).filter(key => !isNaN(data[0][key]));

    numericColumns.forEach(column => {
        const values = data.map(row => parseFloat(row[column]));
        
        // Calculate sum
        const sum = values.reduce((a, b) => a + b, 0);
        
        // Calculate mean
        const mean = sum / values.length;

        // Calculate median
        values.sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];

        // Calculate mode
        const frequency = {};
        values.forEach(value => {
            frequency[value] = (frequency[value] || 0) + 1;
        });
        const mode = Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);

        stats[column] = { sum, mean, median, mode };
    });

    return stats;
}

// Routes
app.get('/', (req, res) => {
    res.render('index'); // Render the index.ejs file
});

app.post('/upload', upload.single('datafile'), (req, res) => {
    const results = [];
    const filePath = path.join(__dirname, req.file.path);
    const calculateStats = req.body.calculateStats !== undefined; // Check if the stats option is selected

    // Read and parse the CSV file
    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            // Delete the uploaded file after processing
            fs.unlinkSync(filePath);

            let stats = null;
            if (calculateStats) {
                // Calculate statistics if user requested it
                stats = calculateSumMeanMedianMode(results);
            }

            // Render the results in result.ejs, passing stats if calculated
            res.render('result', { data: results, stats });
        });
});

app.post('/visualize', (req, res) => {
    const { chartType, column } = req.body; // Get user-selected chart type and column
    const filePath = path.join(__dirname, 'uploads', req.body.uploadedFile); // Adjusted for uploaded file

    const results = [];
    // Read the uploaded CSV file again for visualization
    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            const values = results.map(row => parseFloat(row[column])); // Get values for the selected column
            res.render('visualization', { chartType, values, column }); // Render the visualization.ejs file
        });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
