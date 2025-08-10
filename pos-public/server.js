const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || 'https://api-production-8536.up.railway.app';

// Enable CORS
app.use(cors());

// Middleware to replace backend URL in HTML
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    const fs = require('fs');
    const htmlPath = path.join(__dirname, 'index.html');
    
    try {
      let html = fs.readFileSync(htmlPath, 'utf8');
      // Replace placeholder with actual backend URL
      html = html.replace(/your-backend-name\.railway\.app/g, BACKEND_URL.replace('https://', ''));
      res.send(html);
    } catch (error) {
      console.error('Error reading HTML file:', error);
      next();
    }
  } else {
    next();
  }
});

// Serve static files
app.use(express.static(__dirname));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'GiLi PoS Web Server running',
        timestamp: new Date().toISOString(),
        port: PORT,
        backend: BACKEND_URL
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 GiLi PoS Web Server running on port ${PORT}`);
    console.log(`🚀 Access your PoS at: http://localhost:${PORT}`);
    console.log(`🔗 Connected to backend: ${BACKEND_URL}`);
});