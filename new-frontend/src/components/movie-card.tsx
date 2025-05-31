"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Calendar, Play } from "lucide-react"
import { Movie } from "@/lib/api"

interface MovieCardProps {
  movie: Movie
  size?: "sm" | "md" | "lg"
  className?: string
}

export function MovieCard({ movie, size = "md", className = "" }: MovieCardProps) {
  const imageUrl = movie.poster_path || movie.backdrop_path
    ? `https://www.themoviedb.org/t/p/w300${movie.poster_path || movie.backdrop_path}`
    : "/placeholder-movie.png"

  const title = movie.title || movie.name || movie.original_title || movie.original_name || "Unknown Title"
  const releaseDate = movie.release_date || movie.first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null

  const sizes = {
    sm: { width: 150, height: 225, textSize: "text-sm" },
    md: { width: 200, height: 300, textSize: "text-base" },
    lg: { width: 250, height: 375, textSize: "text-lg" }
  }

  const currentSize = sizes[size]

  return (
    <div className={className}>
      <Link href={`/watch/${movie.id}`}>
        <Card className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg">
        <div className="relative overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            width={currentSize.width}
            height={currentSize.height}
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
          
          {/* Overlay with play button */}
          <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
            <div className="rounded-full bg-primary p-3">
              <Play className="h-6 w-6 text-primary-foreground fill-current" />
            </div>
          </div>

          {/* Rating badge */}
          {movie.vote_average && movie.vote_average > 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-black/70 text-white">
                <Star className="h-3 w-3 mr-1 fill-current" />
                {movie.vote_average.toFixed(1)}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-3">
          <h3 className={`font-semibold line-clamp-2 ${currentSize.textSize}`}>
            {title}
          </h3>
          
          {year && (
            <div className="flex items-center mt-1 text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              <span className="text-xs">{year}</span>
            </div>
          )}
          
          {movie.overview && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
              {movie.overview}
            </p>
          )}
        </CardContent>
        </Card>
      </Link>
    </div>
  )
}
