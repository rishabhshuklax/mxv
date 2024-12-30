import { faPlay, faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Link } from "react-router-dom";

const MovieCard = (props) => {
  return (
    <div className="relative w-48 h-72 rounded-xl overflow-hidden bg-gray-800 shadow-lg hover:shadow-xl transition-transform duration-300 transform hover:-translate-y-2">
      {/* Movie Poster */}
      <img
        src={`https://www.themoviedb.org/t/p/w220_and_h330_bestv2${props.backdrop_path || props.poster_path}`}
        alt={props.title || props.name || props.original_name}
        className="w-full h-full object-cover"
      />

      {/* Gradient & Blur Overlay */}
      <div className="movie-card-blur-overlay-container absolute bottom-2 w-full h-20">
        <div className="movie-card-blur-overlay bg-gradient-to-t from-black/70 to-transparent backdrop-blur-md"></div>
      </div>

      {/* Movie Details */}
      <div className="absolute bottom-4 left-4 text-white z-10">
        <h3 className="text-sm font-bold mb-1">
          {props.title || props.name || props.original_name}
        </h3>
        <p className="text-xs opacity-80 mb-2">{props.release_date || props.first_air_date}</p>

        {/* Rating and Action */}
        <div className="flex items-center">
          {/* Rating */}
          <div className="flex items-center text-xs text-yellow-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <FontAwesomeIcon
                key={i}
                icon={faStar}
                className={i < props.vote_average / 2 ? "" : "text-gray-600"}
              />
            ))}
          </div>

          {/* Play Button */}
          <Link to={`/play/${props.id}`}>
            <button
                onClick={() => {props.closeModal && props.closeModal(false);}}
                className="ml-auto bg-red-600 w-8 h-8 flex items-center justify-center rounded-full shadow-lg"
            >
                <FontAwesomeIcon icon={faPlay} />
            </button>
        </Link>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
