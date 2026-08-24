const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Load local configuration when the server is launched directly.
if (typeof process.loadEnvFile === 'function' && fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

const app = express();
app.use(cors());

// Configuration
const DATA_PATH = process.env.DATA_PATH || '\\\\aklc\\shared\\CCO\\Development Auckland\\700 Marina Ops\\Westhaven\\OccupancyReport';
const PORT = process.env.SERVER_PORT || 5000;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve Excel files from UNC path
app.get('/api/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: only allow xlsx files and prevent path traversal
    if (!filename.endsWith('.xlsx') || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(DATA_PATH, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File not found: ${filename}` });
    }

    // Stream the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// List available files
app.get('/api/files', (req, res) => {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return res.status(404).json({ error: 'Data path not found', path: DATA_PATH });
    }

    const files = fs.readdirSync(DATA_PATH)
      .filter(file => file.endsWith('.xlsx'))
      .map(file => ({
        name: file,
        path: path.join(DATA_PATH, file),
        size: fs.statSync(path.join(DATA_PATH, file)).size
      }));

    res.json({ files, dataPath: DATA_PATH });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`File server running on http://localhost:${PORT}`);
  console.log(`Reading from: ${DATA_PATH}`);
});
