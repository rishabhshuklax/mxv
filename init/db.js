const mongoose = require('mongoose'),
  mongoURI = process.env.MONGODB_URI;

// Connect to MongoDB
if (mongoURI) {
  mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('MONGODB_URI not set; skipping MongoDB connection.');
}
