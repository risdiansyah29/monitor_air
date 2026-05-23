const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config({ override: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Make io accessible to our arduino serial handler
app.set('io', io);

// API Endpoint to get historical data
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const [rows] = await db.query(
      'SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT ?', 
      [limit]
    );
    res.json(rows.reverse()); // Reverse to get chronological order
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history data' });
  }
});

// API Endpoint to export historical data to CSV
app.get('/api/export-csv', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM sensor_data ORDER BY created_at DESC');
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sensor_data_export.csv"');

    // Create CSV header
    let csv = 'ID,Jarak (cm),Ketinggian Air (%),Status,Waktu\n';
    
    // Append rows
    rows.forEach(row => {
      // Use local string format to make it readable in Excel
      const date = new Date(row.created_at).toLocaleString('id-ID');
      csv += `${row.id},${row.distance},${row.water_percentage},${row.status},"${date}"\n`;
    });

    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV data' });
  }
});

// API Endpoint to reset/truncate all historical data
app.delete('/api/reset', async (req, res) => {
  try {
    await db.query('DELETE FROM sensor_data');
    // SQLite doesn't support TRUNCATE, so we delete rows and reset autoincrement ID manually
    await db.query("DELETE FROM sqlite_sequence WHERE name='sensor_data'").catch(() => {});
    
    res.json({ message: 'Semua data riwayat berhasil dihapus dan ID telah di-reset.' });
    
    // Broadcast an event to tell all clients to clear their charts
    io.emit('dataReset');
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Gagal mereset data riwayat' });
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Send latest data on connect
  db.query('SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 1')
    .then(([rows]) => {
      if (rows.length > 0) {
        socket.emit('sensorData', rows[0]);
      }
    })
    .catch(err => console.error('Error sending initial data:', err));

  socket.on('toggleBuzzer', (isMuted) => {
    app.emit('toggleBuzzer', isMuted);
    console.log(`Buzzer muted state changed to: ${isMuted}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize Serial Port connection
  require('./arduino')(app);
});
// Trigger nodemon restart to load new .env configurations
