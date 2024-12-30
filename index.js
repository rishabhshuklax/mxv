const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();
const MovieController = require('./controller/MovieController'),
  UserController = require('./controller/UserController'),
  authenticateToken = require('./middleware/authenticate');
const userInPathMiddleware = require('./middleware/userInPath.js');
const DiscoverController = require('./controller/DiscoverController.js');
const PlayerController = require('./controller/PlayerController.js');

  // initialize mongodb
  require('./init/db.js');


const app = express();
app.use(express.json());

const PORT = 3001;  // You can choose any port

// Define the target server and other options
const STREAM_API_URL = process.env.STREAM_API_URL;

// Proxy middleware options.
const options = {
  target: STREAM_API_URL,
  changeOrigin: true
};

const apiProxy = createProxyMiddleware(options);

app.use(cors());

// Use the proxy to forward requests starting with /api to the STREAM_API_URL
app.use('/vapi', apiProxy);

app.get('/video/proxy', async (req, res) => {
  PlayerController.proxyVideo(req, res);
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

// Start the proxy server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
