'use client'

import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Calendar, Mail, User, Settings, Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <Avatar className="h-32 w-32">
              <AvatarImage src={user.profile?.avatarUrl} alt={user.username} />
              <AvatarFallback className="text-4xl">
                {user.profile?.firstName?.[0] || user.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">
                {user.profile?.firstName && user.profile?.lastName
                  ? `${user.profile.firstName} ${user.profile.lastName}`
                  : user.username
                }
              </h1>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              {user.profile?.dateOfBirth && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(user.profile.dateOfBirth).toLocaleDateString()}
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Profile Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>
                Your viewing preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Preferred Language</h4>
                <Badge variant="secondary">
                  {user.preferences?.language || 'English'}
                </Badge>
              </div>
              
              {user.preferences?.genres && user.preferences.genres.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Favorite Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.preferences.genres.map((genre, index) => (
                      <Badge key={index} variant="outline">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-2">Notifications</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Email notifications</span>
                    <Badge variant={user.preferences?.notifications?.email ? "default" : "secondary"}>
                      {user.preferences?.notifications?.email ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Push notifications</span>
                    <Badge variant={user.preferences?.notifications?.push ? "default" : "secondary"}>
                      {user.preferences?.notifications?.push ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
              <CardDescription>
                Your viewing activity and milestones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{user.watchlist?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Watchlist Items</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{user.watchHistory?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Watched</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{user.ratings?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Ratings Given</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{user.reviews?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
