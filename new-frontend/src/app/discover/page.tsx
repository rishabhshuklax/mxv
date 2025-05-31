'use client';

import { useEffect, useState } from 'react';
import { Movie, Genre } from '@/lib/api';
import { movieAPI, genreAPI } from '@/lib/api';
import { MovieCard } from '@/components/movie-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, Grid, List } from 'lucide-react';

export default function DiscoverPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchGenres = async () => {
    try {
      setLoading(true);
      const genresData = await genreAPI.getGenres();
      setGenres(genresData);
    } catch (err) {
      setError('Failed to load genres');
      console.error('Error fetching genres:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoviesByGenre = async (genre: Genre, pageNum = 1, resetMovies = true) => {
    try {
      setLoadingMovies(true);
      setError(null);
      
      const moviesData = await genreAPI.getMoviesByGenre(genre.id, pageNum);
      
      if (resetMovies) {
        setMovies(moviesData);
      } else {
        setMovies(prev => [...prev, ...moviesData]);
      }
      
      setHasMore(moviesData.length === 20); // Assume 20 per page
      setPage(pageNum);
    } catch (err) {
      setError('Failed to load movies');
      console.error('Error fetching movies by genre:', err);
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleGenreSelect = (genre: Genre) => {
    setSelectedGenre(genre);
    setPage(1);
    fetchMoviesByGenre(genre, 1, true);
  };

  const loadMore = () => {
    if (!loadingMovies && hasMore && selectedGenre) {
      fetchMoviesByGenre(selectedGenre, page + 1, false);
    }
  };

  const clearSelection = () => {
    setSelectedGenre(null);
    setMovies([]);
    setPage(1);
    setHasMore(true);
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <Skeleton className="h-8 w-48 mx-auto" />
          <div className="flex flex-wrap gap-2 justify-center">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && genres.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-red-500 text-lg">{error}</p>
          <Button 
            onClick={fetchGenres} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Discover Movies & TV Shows</h1>
          <p className="text-muted-foreground">
            Browse content by genre and find something new to watch
          </p>
        </div>

        {/* Genre Filter */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Genres
            </h2>
            {selectedGenre && (
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
            )}
          </div>

          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-2 pb-4">
              {genres.map((genre) => (
                <Badge
                  key={genre.id}
                  variant={selectedGenre?.id === genre.id ? "default" : "secondary"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                  onClick={() => handleGenreSelect(genre)}
                >
                  {genre.name}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Selected Genre Display */}
        {selectedGenre && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {selectedGenre.name} Movies & TV Shows
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Movies Grid */}
        {selectedGenre && (
          <>
            {loadingMovies && movies.length === 0 && (
              <div className={`grid gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5' 
                  : 'grid-cols-1'
              }`}>
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-72 rounded-lg" />
                ))}
              </div>
            )}

            {movies.length > 0 && (
              <div className="space-y-6">
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5' 
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {movies.map((movie) => (
                    <MovieCard 
                      key={movie.id} 
                      movie={movie} 
                      size={viewMode === 'grid' ? 'sm' : 'md'}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center">
                    <Button 
                      onClick={loadMore} 
                      disabled={loadingMovies}
                      variant="outline"
                      size="lg"
                    >
                      {loadingMovies ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!loadingMovies && movies.length === 0 && (
              <div className="text-center py-20">
                <div className="space-y-4">
                  <Filter className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-semibold">No movies found</h3>
                  <p className="text-muted-foreground">
                    No movies available for the selected genre
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Initial State */}
        {!selectedGenre && (
          <div className="text-center py-20">
            <div className="space-y-4">
              <Filter className="w-16 h-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">Select a genre to start</h3>
              <p className="text-muted-foreground">
                Choose from the genres above to discover movies and TV shows
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
