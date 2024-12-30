const axios = require('axios');
const { Readable } = require('stream');

module.exports = {
    proxyVideo: async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'Missing URL parameter' });
        }

        try {
            // Make a request to the original URL with appropriate headers
            const response = await axios.get(url, {
                headers: {
                    'User-Agent':
                        req.headers['user-agent'] ||
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Referer': 'https://vidsrc.me/', // Required Referer for vidsrc.me
                },
                timeout: 10000, // Set a 10-second timeout
                responseType: 'text', // Fetch response as text for modification
            });

            // Process the response body to remove unwanted scripts
            let body = response.data;

            // Remove ad-related scripts and devtools blockers
            body = body.replace(/<script[^>]*src=[^>]*ad[^>]*><\/script>/gi, ''); // Remove ad scripts
            body = body.replace(/<script[^>]*disable-devtool[^>]*><\/script>/gi, ''); // Remove devtools blocker
            body = body.replace(/<script[^>]*>(.*?)disableDevtools(.*?)<\/script>/gis, ''); // Remove inline devtools blockers

            // Convert the modified body to a readable stream
            const modifiedStream = Readable.from(body);

            // Set headers to forward the response content type and allow CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');

            // Pipe the modified response directly to the client
            modifiedStream.pipe(res);
        } catch (error) {
            console.error('Error fetching proxy content:', error.message);

            // Handle different error cases
            if (error.response) {
                return res.status(error.response.status || 502).json({
                    error: `Failed to fetch content. Server responded with ${error.response.status}`,
                });
            } else if (error.code === 'ECONNABORTED') {
                return res.status(504).json({ error: 'Request timed out' });
            } else {
                return res.status(500).json({ error: 'Internal server error' });
            }
        }
    },
};
