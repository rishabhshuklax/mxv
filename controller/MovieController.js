const _ = require('lodash');
const axios = require('axios');
const async = require('async');
const cache = require('../lib/cache');
const { mulberry32 } = require('../lib/rng');

// Express Controller for Movie related things
module.exports = {
    recommend: async (req, res) => {
        cache.edge(res, 180);
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
        cache.edge(res, 3600);
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
            cache.edge(res, 1800);
            const data = await cache.wrap(`extras:${type}:${id}`, 30 * 60 * 1000, async () => {
                const r = await axios.get(url);
                return r.data;
            });

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

    // bio + filmography, deduped and sorted so leads surface before bit parts
    getPerson: async (req, res) => {
        const { id } = req.params;
        const url = `${process.env.TMDB_API_BASE_URL}/3/person/${id}?language=en-US&api_key=${process.env.TMDB_API_KEY}&append_to_response=combined_credits`;

        try {
            cache.edge(res, 1800);
            const data = await cache.wrap(`person:${id}`, 30 * 60 * 1000, async () => {
                const r = await axios.get(url);
                return r.data;
            });

            const credits = [
                ...(data.combined_credits?.cast || []),
                ...(data.combined_credits?.crew || [])
            ];
            const byTitle = new Map();
            credits.forEach((c) => {
                if (!c.poster_path) return;
                const type = c.media_type === 'tv' ? 'tv' : 'movie';
                const key = `${type}~${c.id}`;
                const role = c.character || c.job;
                const existing = byTitle.get(key);
                if (existing) {
                    if (role && !existing._roles.includes(role)) existing._roles.push(role);
                    return;
                }
                byTitle.set(key, { ...c, id: key, _roles: role ? [role] : [] });
            });
            const filmography = _.orderBy(
                Array.from(byTitle.values()).map((c) => ({
                    ...c,
                    role: c._roles.slice(0, 2).join(' / ')
                })),
                [(c) => c.release_date || c.first_air_date || ''],
                ['desc']
            );

            const { combined_credits: _cc, ...person } = data;
            res.json({ ...person, filmography });
        } catch (error) {
            console.log(error.message);
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    },

    // The projection booth: five dials in, one confident verdict out.
    // Pools are drawn deep (popularity-sorted with a rating floor, several pages,
    // film and/or TV), the relax ladder accumulates instead of replacing, picks
    // are weighted by quality so the feature is never a coin-flip with junk, and
    // an exclude list guarantees "deal another" deals titles you haven't seen.
    tonight: async (req, res) => {
        const FORMATS = {
            film: { word: 'a film' },
            series: { word: 'a series' },
            either: { word: 'film or series' }
        };
        const MOODS = {
            electric: { genres: '28,53', tv: '10759', word: 'something electric' },
            funny: { genres: '35', tv: '35', word: 'something funny' },
            tender: { genres: '10749,18', tv: '18', word: 'something tender' },
            dark: { genres: '27,80,53', tv: '80,9648', word: 'something dark' },
            strange: { genres: '878,14,9648', tv: '10765,9648', word: 'something strange' },
            epic: { genres: '12,14,36,10752', tv: '10759,10765,10768', word: 'something epic' },
            true: { genres: '99,36', tv: '99', word: 'something true' },
            childlike: { genres: '16,10751', tv: '16,10762,10751', word: 'something childlike' }
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
            crowd: { gte: 3000, tvGte: 1000, floor: 6.0, word: 'loved by the crowd' },
            balanced: { gte: 400, tvGte: 150, floor: 6.8, word: 'well travelled' },
            hidden: { gte: 50, lte: 900, tvGte: 25, tvLte: 300, floor: 6.8, word: 'far off the beaten path' }
        };

        const formatKey = FORMATS[req.query.format] ? req.query.format : 'film';
        const moodKey = MOODS[req.query.mood] ? req.query.mood : 'strange';
        const eraKey = ERAS[req.query.era] ? req.query.era : 'any';
        const lengthKey = LENGTHS[req.query.length] ? req.query.length : 'standard';
        const pathKey = PATHS[req.query.path] ? req.query.path : 'balanced';
        const format = FORMATS[formatKey];
        const mood = MOODS[moodKey];
        const era = ERAS[eraKey];
        const length = LENGTHS[lengthKey];
        const path = PATHS[pathKey];
        const seed = parseInt(req.query.seed, 10) || Date.now();
        const exclude = new Set(String(req.query.exclude || '').split(',').filter(Boolean));
        cache.edge(res, 600);

        const discover = (media, relax) => {
            const params = new URLSearchParams({
                include_adult: 'false',
                language: 'en-US',
                sort_by: 'popularity.desc',
                api_key: process.env.TMDB_API_KEY,
                with_genres: media === 'tv' ? mood.tv : mood.genres,
                'vote_count.gte': String(media === 'tv' ? path.tvGte : path.gte),
                'vote_average.gte': String(relax < 3 ? path.floor : 5.8)
            });
            const lte = media === 'tv' ? path.tvLte : path.lte;
            if (relax < 3 && lte) params.set('vote_count.lte', String(lte));
            if (relax < 2) {
                const gteField = media === 'tv' ? 'first_air_date.gte' : 'primary_release_date.gte';
                const lteField = media === 'tv' ? 'first_air_date.lte' : 'primary_release_date.lte';
                if (era.gte) params.set(gteField, era.gte);
                if (era.lte) params.set(lteField, era.lte);
            }
            // runtime only constrains films — TV episode runtimes would empty the pool
            if (relax < 1 && media === 'movie') {
                if (length.gte) params.set('with_runtime.gte', String(length.gte));
                if (length.lte) params.set('with_runtime.lte', String(length.lte));
            }
            const base = `${process.env.TMDB_API_BASE_URL}/3/discover/${media}?${params.toString()}`;
            return Promise.all(
                [1, 2, 3].map((pg) =>
                    axios.get(`${base}&page=${pg}`).then((r) => r.data.results || []).catch(() => [])
                )
            ).then((pages) =>
                pages
                    .flat()
                    .filter((m) => m.poster_path && m.backdrop_path && m.overview && !m.softcore)
                    .map((m) => ({ ...m, _type: media }))
            );
        };

        const attempt = async (relax) => {
            const cacheKey = `tonight:${formatKey}:${moodKey}:${eraKey}:${lengthKey}:${pathKey}:${relax}`;
            return cache.wrap(cacheKey, 10 * 60 * 1000, async () => {
                const media = formatKey === 'either' ? ['movie', 'tv'] : [formatKey === 'series' ? 'tv' : 'movie'];
                const batches = await Promise.all(media.map((m) => discover(m, relax)));
                return batches.flat();
            });
        };

        try {
            // accumulate across relax levels so strict matches stay in the pool
            const pool = [];
            const seen = new Set();
            for (let relax = 0; relax <= 3 && pool.length < 24; relax++) {
                const batch = await attempt(relax);
                batch.forEach((m) => {
                    const key = `${m._type}~${m.id}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        pool.push(m);
                    }
                });
            }

            const scored = _.orderBy(
                pool.map((m) => ({
                    ...m,
                    _score: (m.vote_average || 0) * Math.log10((m.vote_count || 0) + 10)
                })),
                ['_score'],
                ['desc']
            ).slice(0, 48);

            // never re-deal what this session has already seen; if the vault is
            // exhausted, fall back to the full deck rather than erroring
            let bag = scored.filter((m) => !exclude.has(`${m._type}~${m.id}`));
            if (bag.length < 3) bag = [...scored];

            // seeded, quality-weighted sampling without replacement: the same seed
            // always deals the same hand, but an 8.4 outdraws a 6.0 by an order of
            // magnitude instead of being a uniform coin-flip
            const rand = mulberry32(seed);
            const weightOf = (m) => Math.pow(Math.max(m._score, 0.1), 3);
            const picks = [];
            while (bag.length && picks.length < 3) {
                let total = 0;
                for (const m of bag) total += weightOf(m);
                let r = rand() * total;
                let idx = 0;
                for (; idx < bag.length - 1; idx++) {
                    r -= weightOf(bag[idx]);
                    if (r <= 0) break;
                }
                picks.push(bag.splice(idx, 1)[0]);
            }

            if (!picks.length) {
                return res.status(404).json({ error: 'Nothing matched the brief — loosen a dial.' });
            }

            const shape = (m) => ({ ..._.omit(m, ['_score', '_type']), id: `${m._type}~${m.id}` });
            const reasonParts = [
                format.word,
                mood.word,
                era.word,
                formatKey === 'series' ? null : length.word,
                path.word
            ].filter(Boolean);
            res.json({
                feature: shape(picks[0]),
                understudies: picks.slice(1).map(shape),
                reason: reasonParts.join(', '),
                poolSize: scored.length,
                format: formatKey,
                seed
            });
        } catch (error) {
            console.log(error.message);
            res.status(error.response?.status || 500).json({ error: error.message });
        }
    },

    search: async (req, res) => {
        cache.edge(res, 300);
        let config = {
            method: 'get',
            url: `${process.env.TMDB_API_BASE_URL}/3/search/movie?page=${req.query.page || 1}&query=${encodeURIComponent(req.query.query || '')}&api_key=${process.env.TMDB_API_KEY}`,
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
                    url: `${process.env.TMDB_API_BASE_URL}/3/search/tv?page=${req.query.page || 1}&query=${encodeURIComponent(req.query.query || '')}&api_key=${process.env.TMDB_API_KEY}`,
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
        cache.edge(res, 3600);
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
        cache.edge(res, 300);
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
        cache.edge(res, 300);
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
        cache.edge(res, 600);
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