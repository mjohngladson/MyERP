// Simple server to serve the PoS web demo
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(__dirname));

// Serve the PoS web demo
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pos-web-demo.html'));
});

// Health check for the web demo server
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'GiLi PoS Web Demo Server running',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🌐 GiLi PoS Web Demo Server running at http://localhost:${PORT}`);
    console.log(`📱 Access the PoS demo in your browser`);
    console.log(`🔗 Make sure GiLi backend is running at http://localhost:8001`);
});