const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const MovieController = require('../controller/MovieController');

process.env.TMDB_API_BASE_URL = process.env.TMDB_API_BASE_URL || 'https://api.themoviedb.org';
process.env.TMDB_API_KEY = process.env.TMDB_API_KEY || 'test-key';

function fakeRes() {
  const res = { statusCode: 200, body: null };
  res.set = () => res;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.send = (body) => {
    res.body = body;
    return res;
  };
  res.json = (body) => res.send(body);
  return res;
}

test('search() URL-encodes a query containing "&" so it is not split into extra params', async () => {
  const seenUrls = [];
  const original = axios.request;
  axios.request = (config) => {
    seenUrls.push(config.url);
    return Promise.resolve({ data: { results: [] } });
  };

  try {
    await new Promise((resolve) => {
      const req = { query: { query: 'Fast & Furious', page: 1 } };
      const res = fakeRes();
      res.send = (body) => {
        resolve();
        return body;
      };
      MovieController.search(req, res);
    });
  } finally {
    axios.request = original;
  }

  assert.equal(seenUrls.length, 2, 'expected one movie search call and one tv search call');
  seenUrls.forEach((url) => {
    assert.ok(url.includes('query=Fast%20%26%20Furious'), `expected encoded query in ${url}`);
    assert.ok(!url.includes('query=Fast & Furious'), `raw "&" must not appear unencoded in ${url}`);
  });
});
