import React, { useEffect, useState } from "react";
import MovieCard from "./MovieCard";

const MovieList = (props) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false); // State to toggle modal

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch(props.from);
        const data = await response.json();
        setMovies(data);
        
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };
    fetchMovies();
  }, [props.from]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const visibleMovies = movies.slice(0, props.times || Math.floor(window.innerWidth/191.997));

  return (
    <div className="p-4 relative">
      {/* View All Button */}
        <h2 className="text-xl font-bold text-white mb-4">{props.type}</h2>
        <button
            onClick={() => setShowAll(true)}
            className="absolute top-4 right-4 bg-red-600 text-white text-sm px-3 py-1 rounded-full hover:bg-red-700 transition duration-300"
        >
            View All
        </button>

      {/* Row of limited movies */}
        <div className="my-5 flex space-x-4">
            {visibleMovies.map((movie, index) => (
            <MovieCard key={index} {...movie} />
            ))}
        </div>

      {/* Modal for full list */}
        {showAll && (
            <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center">
            <div className="bg-gray-900 rounded-lg p-6 max-w-5xl w-full max-h-screen overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">All Movies</h2>
                <button
                    onClick={() => setShowAll(false)}
                    className="text-red-600 text-lg font-bold hover:text-red-400"
                >
                    ✕
                </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {movies.map((movie, index) => (
                    <MovieCard closeModal={setShowAll} key={index} {...movie} />
                ))}
                </div>
            </div>
            </div>
        )}
    </div>
  );
};

export default MovieList;
