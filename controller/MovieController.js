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

    // The projection booth: four dials in, one confident verdict out.
    // Progressive relaxation keeps narrow dial combinations from coming up empty,
    // and a seeded shuffle makes "deal another" deterministic per seed.
    tonight: async (req, res) => {
        const MOODS = {
            electric: { genres: '28,53', word: 'something electric' },
            funny: { genres: '35', word: 'something funny' },
            tender: { genres: '10749,18', word: 'something tender' },
            dark: { genres: '27,80,53', word: 'something dark' },
            strange: { genres: '878,14,9648', word: 'something strange' },
            epic: { genres: '12,14,36,10752', word: 'something epic' },
            true: { genres: '99,36', word: 'something true' },
            childlike: { genres: '16,10751', word: 'something childlike' }
        };
        const ERAS = {
            any: { word: 'from any era' },
            golden: { lte: '1979-12-31', word: 'from the golden age' },
            classics: { gte: '1980-01-01', lte: '1999-12-31', word: "from the '80s and '90s" },
            aughts: { gte: '2000-01-01', lte: '2015-12-31', word: 'from the aughts' },
            fresh: { gte: '2016-01-01', word: 'freshly made' }
        };
        const LENGTHS = {
            brisk: { lte: 99, word: 'under 100 minutes' },
            standard: { gte: 95, lte: 145, word: 'at feature length' },
            grand: { gte: 140, word: 'built for a long sitting' }
        };
        const PATHS = {
            crowd: { gte: 3000, sort: 'popularity.desc', word: 'loved by the crowd' },
            balanced: { gte: 400, sort: 'vote_average.desc', word: 'well travelled' },
            hidden: { gte: 50, lte: 900, sort: 'vote_average.desc', word: 'far off the beaten path' }
        };

        const mood = MOODS[req.query.mood] || MOODS.strange;
        const era = ERAS[req.query.era] || ERAS.any;
        const length = LENGTHS[req.query.length] || LENGTHS.standard;
        const path = PATHS[req.query.path] || PATHS.balanced;
        const seed = parseInt(req.query.seed, 10) || Date.now();

        const attempt = async (relax) => {
            const params = new URLSearchParams({
                include_adult: 'false',
                language: 'en-US',
                sort_by: path.sort,
                api_key: process.env.TMDB_API_KEY,
                with_genres: mood.genres,
                'vote_count.gte': String(path.gte)
            });
            if (relax < 3 && path.lte) params.set('vote_count.lte', String(path.lte));
            if (relax < 2) {
                if (era.gte) params.set('primary_release_date.gte', era.gte);
                if (era.lte) params.set('primary_release_date.lte', era.lte);
            }
            if (relax < 1) {
                if (length.gte) params.set('with_runtime.gte', String(length.gte));
                if (length.lte) params.set('with_runtime.lte', String(length.lte));
            }
            const base = `${process.env.TMDB_API_BASE_URL}/3/discover/movie?${params.toString()}`;
            const pages = await Promise.all(
                [1, 2].map((pg) =>
                    axios.get(`${base}&page=${pg}`).then((r) => r.data.results || []).catch(() => [])
                )
            );
            return pages.flat().filter((m) => m.poster_path && m.backdrop_path && m.overview);
        };

        try {
            let pool = [];
            for (let relax = 0; relax <= 3 && pool.length < 6; relax++) {
                pool = await attempt(relax);
            }
            const seen = new Set();
            pool = pool.filter((m) => !seen.has(m.id) && seen.add(m.id));

            const scored = _.orderBy(
                pool.map((m) => ({
                    ...m,
                    _score: (m.vote_average || 0) * Math.log10((m.vote_count || 0) + 10)
                })),
                ['_score'],
                ['desc']
            ).slice(0, 15);

            // mulberry32-style seeded picks so the same seed always deals the same hand
            let s = seed >>> 0;
            const rand = () => {
                s = (s + 0x6d2b79f5) | 0;
                let t = Math.imul(s ^ (s >>> 15), 1 | s);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
            const bag = [...scored];
            const picks = [];
            while (bag.length && picks.length < 3) {
                picks.push(bag.splice(Math.floor(rand() * bag.length), 1)[0]);
            }

            if (!picks.length) {
                return res.status(404).json({ error: 'No film matched the brief — loosen a dial.' });
            }

            const shape = (m) => ({ ..._.omit(m, '_score'), id: `movie~${m.id}` });
            res.json({
                feature: shape(picks[0]),
                understudies: picks.slice(1).map(shape),
                reason: `${mood.word}, ${era.word}, ${length.word}, ${path.word}`,
                poolSize: pool.length,
                seed
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