const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let retryCount = 0;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    retryCount = 0;

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDB, RETRY_DELAY_MS);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

  } catch (error) {
    retryCount++;
    console.error(`❌ MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      setTimeout(connectDB, RETRY_DELAY_MS);
    } else {
      console.error('   Max retries reached. Exiting.');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
