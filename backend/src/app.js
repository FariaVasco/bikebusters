require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const authRoutes = require('./routes/auth');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const bikeRoutes = require('./routes/bikes');
const bikebustersLocationsRoutes = require('./routes/bikebustersLocations');
const paymentRoutes = require('./routes/paymentRoutes');
const publicApiRoutes = require('./routes/publicApi');
const invoiceRoutes = require('./routes/invoices');
const recoveriesRoutes = require('./routes/recoveries');
const dashboardRoutes = require('./routes/dashboard');
const authMiddleware = require('./middleware/auth');
const bikeUpdateService = require('./services/bikeUpdateService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bike_hunting';

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.set('strictQuery', false);

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
app.use('/api/v1', publicApiRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/recoveries', recoveriesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
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

module.exports = { app, server };