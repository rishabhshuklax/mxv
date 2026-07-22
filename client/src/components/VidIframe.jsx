import React from 'react';

// Demo playback source: "Big Buck Bunny" (c) 2008, Blender Foundation,
// www.bigbuckbunny.org, licensed CC BY 3.0. Used here as a stand-in so the
// player UI is demonstrably functional without relying on any unlicensed
// third-party embed source.
const DEMO_VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4';

const VidIframe = (props) => {
    return (
        <div style={{ textAlign: 'center' }}>
            <video
                title="Movie"
                src={DEMO_VIDEO_URL}
                controls
                autoPlay
                style={{
                    width: '100%',
                    maxHeight: '500px',
                    border: 'none',
                    borderRadius: '10px',
                    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)',
                    backgroundColor: '#000',
                }}
            />
            <p style={{ color: '#999', fontSize: '0.75rem', marginTop: '8px' }}>
                Demo playback — "Big Buck Bunny" (CC BY 3.0, Blender Foundation), standing in for {props.type === 'tv' ? `TMDB TV id ${props.id} (S${props.season || 1}E${props.episode || 1})` : `TMDB movie id ${props.id}`}.
            </p>
        </div>
    );
};

export default VidIframe;
