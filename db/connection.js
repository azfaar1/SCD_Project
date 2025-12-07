const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load environment variables

// Connection URI from .env file
const uri = process.env.MONGODB_URI;
const dbName = process.env.DATABASE_NAME || 'nodevault';

// Create a new MongoClient
const client = new MongoClient(uri);

// Database connection
let dbConnection = null;

async function connectDB() {
  try {
    if (!dbConnection) {
      console.log('🔌 Connecting to MongoDB...');
      await client.connect();
      dbConnection = client.db(dbName);
      console.log('✅ Connected to MongoDB successfully!');
      console.log(`📁 Database: ${dbName}`);
    }
    return dbConnection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function closeDB() {
  try {
    if (client) {
      await client.close();
      console.log('👋 MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = { connectDB, closeDB, getDB: () => dbConnection };
