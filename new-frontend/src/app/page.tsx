'use client';

import { useEffect, useState } from 'react';
import { Movie, TVShow } from '@/lib/api';
import { movieAPI } from '@/lib/api';
import { MovieCard } from '@/components/movie-card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, TrendingUp, Star, Clock } from 'lucide-react';

export default function Home() {
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [newMovies, setNewMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [recentlyAddedMovies, setRecentlyAddedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch recommendations and other data
        const allMovies = await movieAPI.getRecommendations(1);
        
        if (allMovies.length > 0) {
          // Set featured movie (first one for now)
          setFeaturedMovie(allMovies[0]);
          
          // Set new movies (first 20)
          setNewMovies(allMovies.slice(0, 20));
          
          // Set top rated movies (sorted by rating)
          const sortedByRating = [...allMovies]
            .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
            .slice(0, 20);
          setTopRatedMovies(sortedByRating);
          
          // Set recently added (last 20)
          setRecentlyAddedMovies(allMovies.slice(-20).reverse());
        }
      } catch (err) {
        setError('Failed to load movies');
        console.error('Error fetching movies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Featured Movie Skeleton */}
          <div className="relative h-[70vh] rounded-xl overflow-hidden">
            <Skeleton className="w-full h-full" />
          </div>
          
          {/* Movie Sections Skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="flex space-x-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="w-48 h-72 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-red-500 text-lg">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Featured Movie Hero Section */}
      {featuredMovie && (
        <div className="relative h-[70vh] rounded-xl overflow-hidden bg-gradient-to-t from-background to-background/20">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${featuredMovie.backdrop_path ? `https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path}` : '/placeholder-movie.jpg'})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
          
          <div className="relative h-full flex items-end p-8">
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white">
                {featuredMovie.title || featuredMovie.name}
              </h1>
              {featuredMovie.overview && (
                <p className="text-lg text-gray-200 line-clamp-3">
                  {featuredMovie.overview}
                </p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-300">
                {featuredMovie.release_date && (
                  <span>{new Date(featuredMovie.release_date).getFullYear()}</span>
                )}
                {featuredMovie.vote_average && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span>{featuredMovie.vote_average.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-4">
                <Button size="lg" className="bg-white text-black hover:bg-white/90">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Now
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                  More Info
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 space-y-12">
        {/* New Movies Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">New Movies</h2>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4 pb-4">
              {newMovies.map((movie) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  className="w-48 flex-none"
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>

        {/* Top Rated Movies Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Star className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Top Rated</h2>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4 pb-4">
              {topRatedMovies.map((movie) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  className="w-48 flex-none"
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>

        {/* Recently Added Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Recently Added</h2>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4 pb-4">
              {recentlyAddedMovies.map((movie) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  className="w-48 flex-none"
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      </div>
    </div>
  );
}
