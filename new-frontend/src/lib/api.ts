import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken')
        window.location.href = '/auth'
      }
    }
    return Promise.reject(error)
  }
)

export interface Movie {
  id: string
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  overview?: string
  poster_path?: string
  backdrop_path?: string
  release_date?: string
  first_air_date?: string
  vote_average?: number
  vote_count?: number
  genre_ids?: number[]
  adult?: boolean
}

export interface Genre {
  id: number
  name: string
}

export interface TVShow extends Movie {
  seasons?: Season[]
}

export interface Season {
  id: number
  name: string
  season_number: number
  episode_count: number
  air_date?: string
}

export interface User {
  id: string
  username: string
  email: string
  profile?: {
    firstName?: string
    lastName?: string
    avatarUrl?: string
  }
  preferences?: {
    language?: string
    genres?: string[]
  }
}

// Movie & TV API calls
export const movieAPI = {
  getRecommendations: async (page = 1): Promise<Movie[]> => {
    const response = await api.get(`/api/movie/recommend?page=${page}`)
    return response.data
  },

  getMovieById: async (id: string): Promise<Movie> => {
    const response = await api.get(`/api/movie/${id}`)
    return response.data
  },

  getTVById: async (id: string): Promise<TVShow> => {
    const response = await api.get(`/api/tv/${id}`)
    return response.data
  },

  searchEntities: async (query: string, page = 1): Promise<Movie[]> => {
    const response = await api.get(`/api/entity/search?query=${encodeURIComponent(query)}&page=${page}`)
    return response.data
  },

  getRecommendationsById: async (id: string, page = 1): Promise<Movie[]> => {
    const response = await api.get(`/api/movie/${id}/recommendations?page=${page}`)
    return response.data
  }
}

// Genre API calls
export const genreAPI = {
  getGenres: async (): Promise<Genre[]> => {
    const response = await api.get('/api/genres')
    return response.data
  },

  getMoviesByGenre: async (genreId: number, page = 1): Promise<Movie[]> => {
    const response = await api.get(`/api/genres/${genreId}?page=${page}`)
    return response.data
  }
}

// User API calls
export const userAPI = {
  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await api.post('/api/user/create', userData)
    return response.data
  },

  login: async (email: string, password: string): Promise<{ token: string }> => {
    const response = await api.post('/api/user/login', { email, password })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/session/current')
    return response.data
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/api/user/${id}`, userData)
    return response.data
  }
}

export default api
