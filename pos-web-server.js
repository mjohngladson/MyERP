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

// Serve the production PoS (Railway version)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pos-railway-production.html'));
});

// Serve the local demo version
app.get('/local', (req, res) => {
    res.sendFile(path.join(__dirname, 'pos-web-demo.html'));
});

// Serve the diagnostics page
app.get('/diagnostics', (req, res) => {
    res.sendFile(path.join(__dirname, 'pos-railway-diagnostics.html'));
});

// Health check for the web demo server
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'GiLi PoS Web Demo Server running',
        timestamp: new Date().toISOString(),
        versions: {
            production: '/  (connects to Railway)',
            local: '/local  (connects to localhost)'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🌐 GiLi PoS Web Demo Server running at http://localhost:${PORT}`);
    console.log(`🚀 Production PoS (Railway): http://localhost:${PORT}/`);
    console.log(`🏠 Local PoS (localhost): http://localhost:${PORT}/local`);
    console.log(`🔗 Railway Backend: https://api-production-8536.up.railway.app`);
    console.log(`🔗 Railway Frontend: https://ui-production-09dd.up.railway.app`);
});