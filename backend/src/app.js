require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bikeRoutes = require('./routes/bikes');
const bikebustersLocationsRoutes = require('./routes/bikebustersLocations');
const paymentRoutes = require('./routes/paymentRoutes');
const http = require('http');
const socketIo = require('socket.io');
const { Server } = require("socket.io");

const app = express();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bike_hunting';
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Replace with your frontend URL if different
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.set('strictQuery', false);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'bike_hunting'
  })
  .then(async () => {
    console.log('Connected to bike_hunting database');
    try {
        const Bike = mongoose.model('Bike');
        const bikes = await Bike.find({});
        console.log(`Found ${bikes.length} bikes in the database:`, bikes);
      } catch (error) {
        console.error('Error fetching bikes on startup:', error);
      }
    })
  .catch(err => console.error('MongoDB connection error:', err));

// Make io available to our routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bikes', require('./routes/bikes'));
app.use('/api/manufacturers', require('./routes/manufacturers'));
app.use('/api/bikes', require('./routes/reportStolenBike'));
app.use('/api/bikes', bikeRoutes);
app.use('/api/bikebusterslocations', bikebustersLocationsRoutes);
app.use('/pay', paymentRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

console.log('MongoDB URI:', MONGODB_URI.replace(/:\/\/.*@/, '://****:****@')); // Log URI with credentials masked