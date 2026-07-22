const _ = require('lodash');
const axios = require('axios');
const async = require('async');

// Express Controller for Movie related things
module.exports = {
    recommend: async (req, res) => {
        console.log("Inside recommended")
        let latestMovieReqConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.TMDB_API_BASE_URL}/3/movie/now_playing?language=en-US&page=${req.query.page || 1}&api_key=${process.env.TMDB_API_KEY}`,
            headers: { }
            },
            latestTvReqConfig = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${process.env.TMDB_API_BASE_URL}/3/discover/tv?include_adult=true&include_null_first_air_dates=false&language=en-US&page=${req.query.page || 1}&api_key=${process.env.TMDB_API_KEY}&sort_by=popularity.desc`,
                headers: { }
            };

        async.auto({
            latestMovie: (callback) => {
                axios.request(latestMovieReqConfig)
                .then((response) => {
                    const movieList = _.map(response.data.results, (movie) => {
                        return {
                            ...movie,
                            id: `movie~${movie.id}`,
                        }
                    });

                    callback(null, movieList);
                })
                .catch((error) => {
                    console.log(error);
                    callback(error);
                });
            },
            latestTv: (callback) => {
                axios.request(latestTvReqConfig)
                .then((response) => {
                    const tvList = _.map(response.data.results, (tv) => {
                        return {
                            ...tv,
                            id: `tv~${tv.id}`,
                        }
                    });
                    callback(null, tvList);
                })
                .catch((error) => {
                    console.log(error);
                    callback(error);
                });
            },
            recommendations: ['latestMovie','latestTv', (results, callback) => {
                const movieList = results.latestMovie,
                 tvList = results.latestTv,
                 entityList = _.orderBy([...movieList, ...tvList], ['vote_count'], ['desc']);

                callback(null, entityList);
            }]
        }, (err, results) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: 'Failed to fetch recommendations' });
            } else {
                res.send(results.recommendations);
            }
        });
    },
    getMovie: async (req, res) => {
        console.log('inside getMovie');
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.TMDB_API_BASE_URL}/3/movie/${req.params.id}?language=en-US&api_key=${process.env.TMDB_API_KEY}`,
            headers: { }
            };
            axios.request(config)
            .then((response) => {
                const movie = response.data;
                res.send(movie);
            })
            .catch((error) => {
                console.log(error.message);
                res.status(error.response?.status || 500).json({ error: error.message });
            });
    },

    // details + trailer + cast + watch providers + recommendations, one round trip
    getExtras: async (req, res) => {
        const { type, id } = req.params;
        if (!['movie', 'tv'].includes(type)) {
            return res.status(400).json({ error: 'type must be movie or tv' });
        }
        const region = (req.query.region || 'US').toUpperCase();
        const url = `${process.env.TMDB_API_BASE_URL}/3/${type}/${id}?language=en-US&api_key=${process.env.TMDB_API_KEY}&append_to_response=videos,credits,watch%2Fproviders,recommendations`;

        try {
            const { data } = await axios.get(url);

            const videos = data.videos?.results || [];
            const trailer = videos
                .filter((v) => v.site === 'YouTube' && ['Trailer', 'Teaser'].includes(v.type))
                .sort((a, b) =>
                    (Number(b.official) - Number(a.official)) ||
                    ((a.type === 'Trailer' ? 0 : 1) - (b.type === 'Trailer' ? 0 : 1))
                )[0] || null;

            const cast = (data.credits?.cast || []).slice(0, 16);
            const crew = data.credits?.crew || [];
            const directors = crew.filter((c) => c.job === 'Director').map((c) => c.name);
            const creators = (data.created_by || []).map((c) => c.name);
            const providers = data['watch/providers']?.results?.[region] || null;
            const recommendations = (data.recommendations?.results || [])
                .slice(0, 12)
                .map((e) => ({ ...e, id: `${e.media_type || type}~${e.id}` }));

            const { videos: _v, credits: _c, recommendations: _r, ...details } = data;
            delete details['watch/providers'];

            res.json({
                ...details,
                id: `${type}~${data.id}`,
                tmdbId: data.id,
                type,
                trailer,
                cast,
                directors,
                creators,
                providers,
                region,
                recommendations
            });
        } catch (error) {
            console.log(error.message);
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    },

    search: async (req, res) => {
        let config = {
            method: 'get',
            url: `${process.env.TMDB_API_BASE_URL}/3/search/movie?page=${req.query.page || 1}&query=${req.query.query}&api_key=${process.env.TMDB_API_KEY}`,
            headers: { }
        };

        async.auto({
            searchMovie: (callback) => {
                axios.request(config)
                .then((response) => {
                    const movieList = _.map(response.data.results, (movie) => {
                        return {
                            ...movie,
                            id: `movie~${movie.id}`,
                        }
                    });

                    callback(null, movieList);
                })
                .catch((error) => {
                    console.log(error);
                    callback(error);
                });
            },
            searchTv: (callback) => {
                let config = {
                    method: 'get',
                    url: `${process.env.TMDB_API_BASE_URL}/3/search/tv?page=${req.query.page || 1}&query=${req.query.query}&api_key=${process.env.TMDB_API_KEY}`,
                    headers: { }
                };
                axios.request(config)
                .then((response) => {
                    const tvList = _.map(response.data.results, (tv) => {
                        return {
                            ...tv,
                            id: `tv~${tv.id}`,
                        }
                    });
                    callback(null, tvList);
                })
                .catch((error) => {
                    console.log(error);
                    callback(error);
                });
            },
            movieDetails: ['searchMovie','searchTv', (results, callback) => {
                const movieList = results.searchMovie,
                 tvList = results.searchTv,
                 entityList = _.orderBy([...movieList, ...tvList], ['vote_count'], ['desc']);

                callback(null, entityList);
            }]
        }, (err, results) => {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            } else {
                res.send(results.movieDetails);
            }
        });
    },

    getTv: async (req, res) => {
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.TMDB_API_BASE_URL}/3/tv/${req.params.id}?language=en-US&api_key=${process.env.TMDB_API_KEY}`,
            headers: { }
            };

        axios.request(config)
        .then((response) => {
            const tv = response.data;
            return res.send(tv);
        })
        .catch((error) => {
            console.log(error);
            return res.status(500).json({error: error.message});
        });
    },
    getTrending: async (req, res) => {
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.TMDB_API_BASE_URL}/3/trending/all/${req.query.range || 'week' }?language=en-US&page=${req.query.page || 1}&api_key=${process.env.TMDB_API_KEY}`,
            headers: { }
            };

        axios.request(config)
        .then((response) => {
            const popular = response.data,
                transformed = _.map(popular.results, (entity) => {
                    return {
                        ...entity,
                        id: `${entity.media_type}~${entity.id}`
                    }
                });
                
            return res.send(transformed);
        })
        .catch((error) => {
            console.log(error);
            return res.status(500).json({error: error.message});
        });
    },
    getAiringToday: async (req, res) => {
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.TMDB_API_BASE_URL}/3/tv/airing_today?language=en-US&page=${req.query.page || 1}&api_key=${process.env.TMDB_API_KEY}`,
            headers: { }
            };

        axios.request(config)
        .then((response) => {
            const popular = response.data,
                transformed = _.map(popular.results, (entity) => {
                    return {
                        ...entity,
                        id: `tv~${entity.id}`
                    }
                });
                
            return res.send(transformed);
        })
        .catch((error) => {
            console.log(error);
            return res.status(500).json({error: error.message});
        });
    },
    discoverMovies: async (req, res) => {
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${process.env.TMDB_API_BASE_URL}/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=vote_average.desc&without_genres=99,10755&vote_count.gte=200&api_key=${process.env.TMDB_API_KEY}`,
            headers: { }
            };

        axios.request(config)
        .then((response) => {
            const movieList = _.map(response.data.results, (movie) => {
                return {
                    ...movie,
                    id: `movie~${movie.id}`,
                }
            });

            return res.send(movieList);
        })
        .catch((error) => {
            console.log(error);
            return res.status(500).json({error: error.message});
        });
    }
};