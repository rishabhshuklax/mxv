import React, { useEffect } from 'react';
import MovieList from '../components/MovieList';

const HomePage = (props) => {
    useEffect(() => {
        // Scroll to the top when params.id changes
        window.scrollTo({
            top: 0,
            behavior: "smooth", // Smooth scrolling animation
        });
    });
    return (
    <div className="main-app text-white min-h-screen">
        <MovieList type="Popular" from={`${process.env.REACT_APP_BACKEND_URL}/api/entity/trending`} />
        <MovieList type="Recently Added" from={`${process.env.REACT_APP_BACKEND_URL}/api/movie/recommend`} />
        <MovieList type="Top rated" from={`${process.env.REACT_APP_BACKEND_URL}/api/entity/top`} />
        <MovieList type="Airing Today" from={`${process.env.REACT_APP_BACKEND_URL}/api/entity/airing`} />
    </div>
    );
};

export default HomePage;