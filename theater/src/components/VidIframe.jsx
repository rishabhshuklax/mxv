import React, { useEffect, useState } from 'react';
import axios from 'axios';

const VidIframe = (props) => {
    const [iframeSrc, setIframeSrc] = useState('');
    const [error, setError] = useState(false);
    const [isFallback, setIsFallback] = useState(false);

    useEffect(() => {
        const videoUrl = `https://vidsrc.me/embed/${props.type}?tmdb=${props.id}${
            props.type === 'tv' ? `&season=${props.season || 1}&episode=${props.episode || 1}` : ''
        }`;

        const proxyUrl = `${process.env.REACT_APP_BACKEND_URL}//video/proxy?url=${encodeURIComponent(videoUrl)}`;

        const fetchProxyContent = async () => {
            try {
                // Verify if the proxy is working
                const response = await axios.head(proxyUrl);
                if (response.status >= 200 && response.status < 300) {
                    setIframeSrc(proxyUrl); // Use the proxy if successful
                } else {
                    throw new Error('Proxy failed');
                }
            } catch (err) {
                console.warn('Proxy failed. Falling back to original URL:', err.message);
                setIsFallback(true);
                setIframeSrc(videoUrl); // Fallback to original URL
                setError(true);
            }
        };

        fetchProxyContent();
    }, [props.type, props.id, props.season, props.episode]);

    return iframeSrc ? (
        isFallback ? (
        <iframe
            title="Movie"
            src={iframeSrc}
            style={{
                width: '100%',
                height: '500px',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)',
                backgroundColor: '#000',
            }}
            frameBorder="0"
            referrerPolicy="origin"
            allowFullScreen
        />) :
        (<iframe
            title="Movie"
            src={iframeSrc}
            style={{
                width: '100%',
                height: '500px',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)',
                backgroundColor: '#000',
            }}
            frameBorder="0"
            referrerPolicy="origin"
            sandbox="allow-scripts allow-same-origin" // Remove sandbox only on fallback
            allowFullScreen
        />)
    ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h3 style={{ color: 'red' }}>
                {error ? 'Failed to load proxy. Falling back to the original video.' : 'Loading video...'}
            </h3>
        </div>
    );
};

export default VidIframe;
