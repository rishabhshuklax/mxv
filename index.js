const express = require('express');
const cors = require('cors');
require('dotenv').config();
const MovieController = require('./controller/MovieController'),
  UserController = require('./controller/UserController'),
  authenticateToken = require('./middleware/authenticate');
const userInPathMiddleware = require('./middleware/userInPath.js');
const DiscoverController = require('./controller/DiscoverController.js');

// initialize mongodb
require('./init/db.js');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ name: 'mxv-api', status: 'ok' });
});

// get all movies
app.get('/api/movie/recommend', (req, res) => {
    MovieController.recommend(req, res);
});

// get genres list
app.get('/api/genres', (req, res) => {
  DiscoverController.getGenres(req, res);
});

// get movie list of specific genres
app.get('/api/genres/:id', (req, res) => {
  DiscoverController.discoverMovies(req, res);
});

// get movie recommendations based on id
app.get('/api/movie/:movieId/recommendations', (req, res) => {
  DiscoverController.getRecommendations(req, res);
});

// get movie by id
app.get('/api/movie/:id', (req, res) => {
    MovieController.getMovie(req, res);
});

app.get('/api/tv/:id', (req, res) => {
    MovieController.getTv(req, res);
});

// search movies
app.get('/api/entity/search', (req, res) => {
    MovieController.search(req, res);
});


app.get('/api/entity/trending', (req, res) => {
  MovieController.getTrending(req, res);
});

app.get('/api/entity/airing', (req, res) => {
  MovieController.getAiringToday(req, res);
});

app.get('/api/entity/top', (req, res) => {
  MovieController.discoverMovies(req, res);
});

// everything a detail page needs in one call: details, trailer, cast,
// watch providers and recommendations
app.get('/api/entity/:type/:id/extras', (req, res) => {
  MovieController.getExtras(req, res);
});

// the projection booth: dial settings in, one verdict out
app.get('/api/tonight', (req, res) => {
  MovieController.tonight(req, res);
});

// User routes

  // Create a new user
  app.post('/api/user/create', (req, res) => {
    UserController.create(req, res);
  });

  // Get all users
  app.get('/api/user', (req, res) => {
    UserController.getAllUsers(req, res);
  });

  // Get a user by ID
  app.get('/api/user/:id', (req, res) => {
    UserController.getUserById(req, res);
  });

  // Update a user
  app.put('/api/user/:id', [authenticateToken, userInPathMiddleware], (req, res) => {
    UserController.updateUser(req, res);
  });

  // Delete a user
  app.delete('/api/user/:id', (req, res) => {
    UserController.deleteUser(req, res);
  });

  // Login
  app.post('/api/user/login', (req, res) => {
    UserController.login(req, res);
  });

  // Check if a user is authenticated
  app.get('/api/session/current', authenticateToken, (req, res) => {
    res.status(200).json(req.user);
  });

// Start the server (skip when running as a Vercel serverless function)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
