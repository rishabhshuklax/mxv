const _ = require('lodash');
const axios = require('axios');
const async = require('async');
const cache = require('../lib/cache');

module.exports = {
    getGenres: async (req, res) => {
        try {
            const genres = await cache.wrap('genres:movie', 24 * 60 * 60 * 1000, async () => {
                const { data } = await axios.get(
                    `${process.env.TMDB_API_BASE_URL}/3/genre/movie/list?language=en-US&api_key=${process.env.TMDB_API_KEY}`
                );
                return data.genres;
            });
            cache.edge(res, 3600);
            res.json(genres);
        } catch (error) {
            console.error('Error fetching genres:', error.message);
            res.status(500).json({ error: 'Failed to fetch genres' });
        }
    },

    discoverMovies: async (req, res) => {
        const genreId = req.params.id; // Extract the genre ID from the URL
        const page = req.query.page || 1; // Default to page 1 if no page is specified
        cache.edge(res, 300);

        let discoverMoviesConfig = {
                method: 'get',
                url: `${process.env.TMDB_API_BASE_URL}/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=${genreId}`,
                headers: {
                    accept: 'application/json',
                    Authorization: `Bearer ${process.env.TMDB_API_READ_KEY}` // Ensure you set TMDB_API_READ_KEY in your environment variables
                }
            },
            discoverTvConfig = {
                method: 'get',
                url: `${process.env.TMDB_API_BASE_URL}/3/discover/tv?include_adult=false&include_null_first_air_dates=false&language=en-US&page=${page}&api_key=${process.env.TMDB_API_KEY}&sort_by=popularity.desc`,
                headers: {}
            };

        async.auto({
            movies: (callback) => {
                axios.request(discoverMoviesConfig)
                    .then((response) => {
                        console.log(`Movies fetched for genre ID: ${genreId}, Page: ${page}`);
                        callback(null, response.data.results);
                    })
                    .catch((error) => {
                        console.error('Error fetching movies:', error.message);
                        callback(error);
                    });
            },
            tv: (callback) => {
                axios.request(discoverTvConfig)
                    .then((response) => {
                        console.log(`TV shows fetched for genre ID: ${genreId}, Page: ${page}`);
                        callback(null, response.data.results);
                    })
                    .catch((error) => {
                        console.error('Error fetching TV shows:', error.message);
                        callback(error);
                    });
            },
            recommendations: ['movies', 'tv', (results, callback) => {
                const movieList = _.map(results.movies, (movie) => {
                        return {
                            ...movie,
                            id: `movie~${movie.id}`,
                        }
                    }),
                    tvList = _.map(results.tv, (tv) => {
                        return {
                            ...tv,
                            id: `tv~${tv.id}`,
                        }
                    }),
                    entityList = _.orderBy([...movieList, ...tvList], ['vote_count'], ['desc']);

                callback(null, entityList);
            }]
        }, (err, results) => {
            if (err) {
                console.error(err);
                res.status(500).send({ error: 'Failed to fetch movies' });
            } else {
                res.json(results.recommendations);
            }
        });
    },

    getRecommendations: async (req, res) => {
        const movieId = req.params.movieId; // Extract the movie ID from the URL
        const page = req.query.page || 1; // Default to page 1 if no page is specified
        console.log(`Fetching recommendations for movie ID: ${movieId}, Page: ${page}`);

        let movieRecommendationReqConfig = {
            method: 'get',
            url: `${process.env.TMDB_API_BASE_URL}/3/movie/${movieId}/recommendations?language=en-US&page=${page}`,
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${process.env.TMDB_API_READ_KEY}` // Ensure you set TMDB_API_READ_KEY in your environment variables
            }
        },
        tvRecommendationReqConfig = {
            method: 'get',
            url: `${process.env.TMDB_API_BASE_URL}/3/tv/${movieId}/recommendations?language=en-US&page=${page}`,
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${process.env.TMDB_API_READ_KEY}` // Ensure you set TMDB_API_READ_KEY in your environment variables
            }
        },
        movieSimilarReqConfig = {
            method: 'get',
            url: `${process.env.TMDB_API_BASE_URL}/3/movie/${movieId}/similar?language=en-US&page=${page}`,
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${process.env.TMDB_API_READ_KEY}` // Ensure you set TMDB_API_READ_KEY in your environment variables
            }
        },
        tvSimilarReqConfig = {
            method: 'get',
            url: `${process.env.TMDB_API_BASE_URL}/3/tv/${movieId}/similar?language=en-US&page=${page}`,
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${process.env.TMDB_API_READ_KEY}` // Ensure you set TMDB_API_READ_KEY in your environment variables
            }
        };

        async.auto({
            movieRecommendations: (callback) => {
                axios.request(movieRecommendationReqConfig)
                    .then((response) => {
                        console.log(`Recommendations fetched for movie ID: ${movieId}, Page: ${page}`);
                        callback(null, response.data.results);
                    })
                    .catch((error) => {
                        console.error('Error fetching movie recommendations:', error.message);
                        callback();
                    });
            },
            tvRecommendations: (callback) => {
                axios.request(tvRecommendationReqConfig)
                    .then((response) => {
                        console.log(`Recommendations fetched for TV show ID: ${movieId}, Page: ${page}`);
                        callback(null, response.data.results);
                    })
                    .catch((error) => {
                        console.error('Error fetching TV show recommendations:', error.message);
                        callback();
                    });
            },
            similarMovie: (callback) => {
                axios.request(movieSimilarReqConfig)
                    .then((response) => {
                        console.log(`Similar movies fetched for movie ID: ${movieId}, Page: ${page}`);
                        callback(null, response.data.results);
                    })
                    .catch((error) => {
                        console.error('Error fetching similar movies:', error.message);
                        callback();
                    });
            },
            similarTv: (callback) => {
                axios.request(tvSimilarReqConfig)
                    .then((response) => {
                        console.log(`Similar TV shows fetched for TV show ID: ${movieId}, Page: ${page}`);
                        callback(null, response.data.results);
                    })
                    .catch((error) => {
                        console.error('Error fetching similar TV shows:', error.message);
                        callback();
                    });
            },
            recommendations: ['movieRecommendations', 'tvRecommendations', 'similarMovie', 'similarTv', (results, callback) => {
                const movieList = _.map(results.movieRecommendations, (movie) => {
                        return {
                            ...movie,
                            id: `movie~${movie.id}`,
                        }
                    }),
                    tvList = _.map(results.tvRecommendations, (tv) => {
                        return {
                            ...tv,
                            id: `tv~${tv.id}`,
                        }
                    }),
                    similarMovieList = _.map(results.similarMovie, (movie) => {
                        return {
                            ...movie,
                            id: `movie~${movie.id}`,
                        }
                    }),
                    similarTvList = _.map(results.similarTv, (tv) => {
                        return {
                            ...tv,
                            id: `tv~${tv.id}`,
                        }
                    }),
                    entityList = _.orderBy([...movieList, ...tvList, ...similarMovieList, ...similarTvList], ['vote_count'], ['desc']) || [];

                callback(null, entityList);
            }]
        }, (err, results) => {
            console.log('Recommendations:', results.recommendations);
            if (results?.recommendations?.length === 0) {
                console.error(err);
                return res.status(500).send({ error: 'Failed to fetch recommendations' });
            }
            res.json(results.recommendations);
        });
    }
};
