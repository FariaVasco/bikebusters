const { app, server } = require('./app');
const bikeUpdateService = require('./services/bikeUpdateService');

const PORT = process.env.PORT || 5001;

let pollingInterval;

const startPolling = () => {
  const POLLING_INTERVAL = 0.5 * 60 * 1000; // 4 minutes in milliseconds
  pollingInterval = setInterval(() => {
    bikeUpdateService.pollForUpdates();
  }, POLLING_INTERVAL);
  console.log('Polling service started');
};

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startPolling(); // Start the polling service after the server is up
});

// Handle server shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  console.log('Closing http server.');
  server.close(() => {
    console.log('Http server closed.');
    if (pollingInterval) {
      clearInterval(pollingInterval);
      console.log('Polling service stopped');
    }
    process.exit(0);
  });
});