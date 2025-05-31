'use client'

import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MovieCard } from "@/components/movie-card"
import { Separator } from "@/components/ui/separator"
import { Search, Heart, Clock, Star, Trash2, Grid, List } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function WatchlistPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState<'all' | 'movies' | 'tv'>('all')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // Mock watchlist data since the backend doesn't return detailed movie data in user object
  const mockWatchlist = [
    {
      id: 1,
      title: "The Matrix",
      poster_path: "/placeholder-movie-poster.jpg",
      vote_average: 8.7,
      release_date: "1999-03-31",
      overview: "A computer programmer is lead to fight an underground war against powerful computers who have constructed his entire reality with a system called the Matrix.",
      type: "movie"
    },
    {
      id: 2,
      title: "Breaking Bad",
      poster_path: "/placeholder-tv-poster.jpg", 
      vote_average: 9.5,
      first_air_date: "2008-01-20",
      overview: "A high school chemistry teacher turned methamphetamine producer partners with a former student.",
      type: "tv"
    }
  ]

  const filteredItems = mockWatchlist.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === 'all' || item.type === filter.replace('movies', 'movie').replace('tv', 'tv')
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Watchlist</h1>
          <p className="text-muted-foreground">
            Keep track of movies and TV shows you want to watch
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{mockWatchlist.length}</p>
                </div>
                <Heart className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Movies</p>
                  <p className="text-2xl font-bold">
                    {mockWatchlist.filter(item => item.type === 'movie').length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">M</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">TV Shows</p>
                  <p className="text-2xl font-bold">
                    {mockWatchlist.filter(item => item.type === 'tv').length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded bg-green-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">TV</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Watch Time</p>
                  <p className="text-2xl font-bold">24h</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search your watchlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'movies' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('movies')}
            >
              Movies
            </Button>
            <Button
              variant={filter === 'tv' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('tv')}
            >
              TV Shows
            </Button>
          </div>
          
          {/* View Mode */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredItems.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? 'No items found' : 'Your watchlist is empty'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No items match "${searchQuery}"`
                : 'Start adding movies and TV shows you want to watch!'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/discover')}>
                Discover Content
              </Button>
            )}
          </Card>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <MovieCard movie={item} />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        // Handle remove from watchlist
                        console.log('Remove from watchlist:', item.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                        alt={item.title}
                        className="w-16 h-24 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-movie-poster.jpg'
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.type === 'movie' 
                                ? new Date(item.release_date || '').getFullYear()
                                : new Date(item.first_air_date || '').getFullYear()
                              }
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{item.vote_average.toFixed(1)}</span>
                            </div>
                            <Badge variant={item.type === 'movie' ? 'default' : 'secondary'}>
                              {item.type === 'movie' ? 'Movie' : 'TV Show'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {item.overview}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => router.push(`/watch/${item.id}`)}>
                            Watch Now
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Handle remove from watchlist
                              console.log('Remove from watchlist:', item.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
