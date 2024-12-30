import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const VidIframe = (props) => {
    const [iframeSrc, setIframeSrc] = useState('');
    const iframeRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const videoUrl = `https://vidsrc.me/embed/${props.type}?tmdb=${props.id}${
            props.type === 'tv' ? `&season=${props.season || 1}&episode=${props.episode || 1}` : ''
        }`;

        // Update iframeSrc and reset sandbox state
        setIframeSrc(videoUrl);
    }, [props.type, props.id, props.season, props.episode]);

    useEffect(() => {
        // Remove sandbox attribute on route change
        if (iframeRef.current) {
            iframeRef.current.removeAttribute('sandbox');
            console.log('Sandbox attribute removed on route change.');
        }

        // Reapply sandbox after iframe loads
        const applySandboxTimeout = setTimeout(() => {
            if (iframeRef.current) {
                iframeRef.current.setAttribute(
                    'sandbox',
                    'allow-scripts allow-same-origin'
                );
                console.log('Sandbox attribute reapplied after route change.');
            }
        }, 2000); // Delay to allow iframe to load unrestricted

        return () => clearTimeout(applySandboxTimeout);
    }, [location]); // Triggered when the route changes

    const handleIframeLoad = () => {
        console.log('Iframe content loaded.');
    };

    return iframeSrc ? (
        <iframe
            ref={iframeRef} // Reference to the iframe
            title="Video"
            src={iframeSrc}
            style={{
                width: '100%',
                height: '500px',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)',
            }}
            frameBorder="0"
            allowFullScreen
            onLoad={handleIframeLoad} // Handle iframe load
        />
    ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h3 style={{ color: 'red' }}>Loading video...</h3>
        </div>
    );
};

export default VidIframe;
