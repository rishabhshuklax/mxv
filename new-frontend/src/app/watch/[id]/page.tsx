'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Movie, TVShow } from '@/lib/api';
import { movieAPI } from '@/lib/api';
import { MovieCard } from '@/components/movie-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Play, 
  Star, 
  Calendar, 
  Clock, 
  ArrowLeft,
  Download,
  Share,
  Heart,
  Info
} from 'lucide-react';

// Video Player Component (equivalent to VidIframe)
function VideoPlayer({ movieId, season = 1, episode = 1 }: { 
  movieId: string; 
  season?: number; 
  episode?: number; 
}) {
  const [isLoading, setIsLoading] = useState(true);
  
  const videoUrl = movieId.startsWith('tv~') 
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/vapi/tv/${movieId.split('~')[1]}/${season}/${episode}`
    : `${process.env.NEXT_PUBLIC_BACKEND_URL}/vapi/movie/${movieId.split('~')[1]}`;

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="flex items-center space-x-2 text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span>Loading video...</span>
          </div>
        </div>
      )}
      <iframe
        src={videoUrl}
        className="w-full h-full"
        allowFullScreen
        frameBorder="0"
        onLoad={() => setIsLoading(false)}
        title="Video Player"
      />
    </div>
  );
}

// Episode Selector Component
function EpisodeSelector({ 
  seasons, 
  selectedSeason, 
  selectedEpisode, 
  onEpisodeSelect 
}: {
  seasons: any[];
  selectedSeason: number;
  selectedEpisode: number;
  onEpisodeSelect: (season: number, episode: number) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Episodes</h3>
      
      {/* Season Selector */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 pb-2">
          {seasons.map((season) => (
            <Badge
              key={season.season_number}
              variant={selectedSeason === season.season_number ? "default" : "secondary"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => onEpisodeSelect(season.season_number, 1)}
            >
              Season {season.season_number}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Episode Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((ep) => (
          <Button
            key={ep}
            variant={selectedEpisode === ep ? "default" : "outline"}
            size="sm"
            onClick={() => onEpisodeSelect(selectedSeason, ep)}
            className="aspect-square"
          >
            {ep}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function WatchPage() {
  const params = useParams();
  const movieId = params.id as string;
  
  const [entity, setEntity] = useState<Movie | TVShow | null>(null);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  const isTV = movieId.startsWith('tv~');
  const cleanId = movieId.split('~')[1];

  const fetchEntity = async () => {
    try {
      setLoading(true);
      
      const entityData = isTV 
        ? await movieAPI.getTVById(cleanId)
        : await movieAPI.getMovieById(cleanId);
      
      setEntity(entityData);
      
      // Fetch recommendations
      try {
        const recData = await movieAPI.getRecommendationsById(cleanId);
        setRecommendations(recData.slice(0, 12)); // Limit to 12 recommendations
      } catch (recErr) {
        console.warn('Failed to load recommendations:', recErr);
      }
      
    } catch (err) {
      setError('Failed to load content');
      console.error('Error fetching entity:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodeSelect = (season: number, episode: number) => {
    setSelectedSeason(season);
    setSelectedEpisode(episode);
  };

  useEffect(() => {
    if (movieId) {
      fetchEntity();
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [movieId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <Skeleton className="w-full aspect-video rounded-lg" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-red-500 text-lg">{error || 'Content not found'}</p>
          <Button 
            onClick={() => window.history.back()} 
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const title = entity.title || entity.name || 'Unknown Title';
  const releaseDate = entity.release_date || entity.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Video Player Section */}
      <div className="container mx-auto px-4 py-8">
        <VideoPlayer 
          movieId={movieId} 
          season={selectedSeason} 
          episode={selectedEpisode} 
        />
      </div>

      {/* Content Information */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Actions */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{title}</h1>
                  <div className="flex items-center space-x-4 mt-2 text-muted-foreground">
                    {year && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{year}</span>
                      </div>
                    )}
                    {entity.vote_average && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span>{entity.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                    <Badge variant="secondary">
                      {isTV ? 'TV Show' : 'Movie'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Overview */}
              {entity.overview && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Overview</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {entity.overview}
                  </p>
                </div>
              )}
            </div>

            {/* Episode Selector for TV Shows */}
            {isTV && 'seasons' in entity && entity.seasons && (
              <EpisodeSelector
                seasons={entity.seasons}
                selectedSeason={selectedSeason}
                selectedEpisode={selectedEpisode}
                onEpisodeSelect={handleEpisodeSelect}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Movie Poster */}
            <Card>
              <CardContent className="p-4">
                <img
                  src={
                    entity.poster_path
                      ? `https://image.tmdb.org/t/p/w500${entity.poster_path}`
                      : '/placeholder-movie.jpg'
                  }
                  alt={title}
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Details
                </h3>
                
                {entity.vote_count && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Votes:</span>
                    <span>{entity.vote_count.toLocaleString()}</span>
                  </div>
                )}
                
                {entity.genre_ids && entity.genre_ids.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Genres:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entity.genre_ids.slice(0, 3).map((genreId) => (
                        <Badge key={genreId} variant="outline" className="text-xs">
                          Genre {genreId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{isTV ? 'TV Series' : 'Movie'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold">You might also like</h2>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-4 pb-4">
                {recommendations.map((movie) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={movie} 
                    className="w-48 flex-none"
                    size="sm"
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
