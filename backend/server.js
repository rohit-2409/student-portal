const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const studentRoutes = require('./routes/studentRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;
const MAX_PORT_TRIES = PORT + 5;

// Middleware
app.use(cors()); // Allow all CORS requests for local development simplicity
app.use(express.json()); // Parsing json request body

// Logging requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/students', studentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is up and running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API endpoints available at http://localhost:${port}/api/students`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < MAX_PORT_TRIES) {
      console.warn(`Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);
