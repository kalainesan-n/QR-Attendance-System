const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Copy backend/.env.example to backend/.env and fill it in.");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log("MongoDB connected");
}

function isDbConnected() {
  // 1 means connected (mongoose connection states)
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDb, isDbConnected };
