import React, { useEffect, useState } from 'react';
import MovieList from '../components/MovieList';
import VidIframe from '../components/VidIframe';
import { useParams } from "react-router-dom";
import axios from "axios";

const HomePage = (props) => {
    const params = useParams();
    const [type, setType] = useState(null);
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tvPointer, setTvPointer] = useState({
        season: 1,
        episode: 1,
    });

    useEffect(() => {
        const [parsedType, parsedId] = params.id.split("~");
        setType(parsedType);
    
        const fetchEntity = async () => {
            try {
                const endpoint =
                    parsedType === "tv"
                        ? `${process.env.REACT_APP_BACKEND_URL}/api/tv/${parsedId}`
                        : `${process.env.REACT_APP_BACKEND_URL}/api/movie/${parsedId}`;
    
                const response = await axios.get(endpoint);
                props.setTitle(response.data.title || response.data.name || response.data.original_name);
                setEntity(response.data);
                setLoading(false);
                // Scroll to the top when params.id changes
                window.scrollTo({
                    top: 0,
                    behavior: "smooth", // Smooth scrolling animation
                });
            } catch (error) {
                console.error("Error fetching entity:", error);
                setLoading(false);
            }
        };
    
    
        fetchEntity();
    }, [params]);

    if (loading) {
        return <div>loading...</div>;
    }

    return (
    <div className="flex p-10 theater-container text-white min-h-screen">
        <div className="w-3/5 play-left">
            <VidIframe
                episode={tvPointer.episode}
                season={tvPointer.season}
                id={params.id.split("~")[1]}
                type={type}
            />
            <div className="p-4 play-description">
                <div className="theater-header-content">
                    <p className="text-lg">{entity.overview}</p>
                </div>
            </div>
        </div>
        <div className="w-2/5 play-right">
            <MovieList times={2} type="" from={`${process.env.REACT_APP_BACKEND_URL}/api/movie/${params.id.split("~")[1]}/recommendations`} />
        </div>
    </div>
    );
};

export default HomePage;