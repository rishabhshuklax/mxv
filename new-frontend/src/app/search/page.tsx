'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Movie } from '@/lib/api';
import { movieAPI } from '@/lib/api';
import { MovieCard } from '@/components/movie-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const searchMovies = async (searchQuery: string, pageNum = 1, resetResults = true) => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      const searchResults = await movieAPI.searchEntities(searchQuery, pageNum);
      
      if (resetResults) {
        setResults(searchResults);
      } else {
        setResults(prev => [...prev, ...searchResults]);
      }
      
      setHasMore(searchResults.length === 20); // TMDB returns 20 per page
      setPage(pageNum);
    } catch (err) {
      setError('Failed to search movies');
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchMovies(query.trim(), 1, true);
      // Update URL with search query
      window.history.pushState(null, '', `/search?q=${encodeURIComponent(query)}`);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore && query.trim()) {
      searchMovies(query.trim(), page + 1, false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
    window.history.pushState(null, '', '/search');
  };

  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      searchMovies(urlQuery, 1, true);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Search Header */}
        <div className="space-y-6 mb-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Search Movies & TV Shows</h1>
            <p className="text-muted-foreground">
              Discover your next favorite movie or TV series
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search for movies, TV shows..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Button type="submit" disabled={!query.trim() || loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </div>

        {/* Search Results */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 text-lg">{error}</p>
            <Button 
              onClick={() => searchMovies(query, 1, true)} 
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        )}

        {loading && results.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="w-full h-72 rounded-lg" />
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Search Results for "{query}" ({results.length} found)
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((movie) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  size="sm"
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <Button 
                  onClick={loadMore} 
                  disabled={loading}
                  variant="outline"
                  size="lg"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <div className="text-center py-20">
            <div className="space-y-4">
              <Search className="w-16 h-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">No results found</h3>
              <p className="text-muted-foreground">
                Try searching with different keywords or check your spelling
              </p>
            </div>
          </div>
        )}

        {!query && results.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="space-y-4">
              <Search className="w-16 h-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">Start your search</h3>
              <p className="text-muted-foreground">
                Enter a movie or TV show title above to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
