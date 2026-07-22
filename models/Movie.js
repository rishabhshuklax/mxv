const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create the Movie schema
const movieSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  year: {
    type: Number
  },
  genres: [{
    type: String
  }],
  ratings: {
    type: Number,
    default: 0
  }
});

// Create the Movie model
const Movie = mongoose.model('Movie', movieSchema);
module.exports = Movie;