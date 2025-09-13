import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, of, timer, EMPTY } from 'rxjs';
import { catchError, map, switchMap, retry, retryWhen, delayWhen, take, timeout } from 'rxjs/operators';
import { WeatherData, WeatherResponse, CurrentWeather } from '../models/weather.model';
import { PlacesService } from './places.service';
import { NetworkService } from './network.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly apiUrl = 'https://api.open-meteo.com/v1/forecast';
  private readonly cacheTimeout = 10 * 60 * 1000; // 10 minutes in milliseconds
  private readonly offlineCacheTimeout = 24 * 60 * 60 * 1000; // 24 hours for offline mode
  private readonly cacheKey = 'weather_cache';
  private weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
  private offlineRetryAttempts = 0;
  private maxOfflineRetryAttempts = 3;

  constructor(
    private http: HttpClient,
    private placesService: PlacesService,
    private networkService: NetworkService
  ) {}

  /**
   * Generate cache key from coordinates
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Cache key string
   */
  private generateCacheKey(latitude: number, longitude: number): string {
    // Round to 2 decimal places for cache efficiency
    const lat = Math.round(latitude * 100) / 100;
    const lng = Math.round(longitude * 100) / 100;
    return `${lat},${lng}`;
  }

  /**
   * Get cached weather data if available and not expired
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param allowExpiredForOffline - Allow expired cache data when offline
   * @returns Cached WeatherData or null
   */
  private getCachedWeather(latitude: number, longitude: number, allowExpiredForOffline = false): WeatherData | null {
    const cacheKey = this.generateCacheKey(latitude, longitude);
    const cached = this.weatherCache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const isExpired = age >= this.cacheTimeout;
      
      // Return fresh cache data
      if (!isExpired) {
        console.log('Weather data served from fresh cache for coordinates:', latitude, longitude);
        return cached.data;
      }
      
      // Return stale cache data if offline and within offline timeout
      if (allowExpiredForOffline && !this.networkService.isOnline() && age < this.offlineCacheTimeout) {
        console.log('Weather data served from stale cache (offline mode) for coordinates:', latitude, longitude);
        return cached.data;
      }
      
      // Clean expired cache entry if online or beyond offline timeout
      if (this.networkService.isOnline() || age >= this.offlineCacheTimeout) {
        this.weatherCache.delete(cacheKey);
      }
    }
    
    return null;
  }

  /**
   * Cache weather data
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param data - Weather data to cache
   */
  private setCachedWeather(latitude: number, longitude: number, data: WeatherData): void {
    const cacheKey = this.generateCacheKey(latitude, longitude);
    this.weatherCache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
    console.log('Weather data cached for coordinates:', latitude, longitude);
  }

  /**
   * Clear expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.weatherCache.forEach((cached, key) => {
      if ((now - cached.timestamp) >= this.cacheTimeout) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.weatherCache.delete(key));
  }

  /**
   * Get current weather data for given coordinates with enhanced offline support
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Observable<WeatherData>
   */
  getCurrentWeather(latitude: number, longitude: number): Observable<WeatherData> {
    // Clean expired cache entries periodically
    this.cleanExpiredCache();
    
    // Check cache first (including stale data for offline mode)
    const cachedData = this.getCachedWeather(latitude, longitude, true);
    
    // If offline, return cached data or throw error
    if (!this.networkService.isOnline()) {
      if (cachedData) {
        return of(cachedData);
      } else {
        return throwError(() => new Error('No internet connection and no cached weather data available'));
      }
    }
    
    // If online and have fresh cache data, return it
    if (cachedData) {
      const freshCachedData = this.getCachedWeather(latitude, longitude, false);
      if (freshCachedData) {
        return of(freshCachedData);
      }
    }

    // Make API call with enhanced error handling - now includes daily forecast
    const params = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: '4' // Today + 3 days
    };

    const requestTimeout = this.networkService.getRecommendedTimeout();
    const retryIntervals = this.networkService.getRetryIntervals();

    return this.http.get<WeatherResponse>(this.apiUrl, { params })
      .pipe(
        timeout(requestTimeout),
        map(response => {
          const weatherData = this.mapApiResponseToWeatherData(response);
          // Cache the result
          this.setCachedWeather(latitude, longitude, weatherData);
          // Reset offline retry attempts on success
          this.offlineRetryAttempts = 0;
          return weatherData;
        }),
        retryWhen(errors => 
          errors.pipe(
            delayWhen((error, retryIndex) => {
              // If we exceed max retries, return stale cache or error
              if (retryIndex >= retryIntervals.length) {
                if (cachedData) {
                  console.warn('API failed after max retries, returning stale cache data');
                  return EMPTY; // This will cause the retryWhen to complete, but we handle it below
                } else {
                  return throwError(() => error);
                }
              }
              
              const delay = retryIntervals[retryIndex];
              console.log(`Weather API retry ${retryIndex + 1} after ${delay}ms`);
              return timer(delay);
            }),
            take(retryIntervals.length)
          )
        ),
        catchError(error => {
          // Return stale cache data if available, otherwise throw error
          if (cachedData) {
            console.warn('Weather API failed, returning stale cache data:', error.message);
            return of(cachedData);
          } else {
            return this.handleError(error);
          }
        })
      );
  }

  /**
   * Map Open-Meteo API response to our WeatherData interface
   * @param response - Open-Meteo API response
   * @returns WeatherData
   */
  private mapApiResponseToWeatherData(response: WeatherResponse): WeatherData {
    const weatherCode = response.current.weather_code;

    // Map daily forecast data if available
    let dailyForecast;
    if (response.daily && response.daily.time && response.daily.time.length > 1) {
      // Skip today (index 0) and take next 3 days (indices 1, 2, 3)
      const forecastDates = response.daily.time.slice(1, 4);

      dailyForecast = forecastDates.map((date, index) => {
        const dayIndex = index + 1; // Adjust to access correct indices in daily arrays

        return {
          date: date,
          dayName: this.getDayName(date),
          temperature: {
            min: Math.round(response.daily!.temperature_2m_min[dayIndex]),
            max: Math.round(response.daily!.temperature_2m_max[dayIndex])
          },
          conditions: {
            code: response.daily!.weather_code[dayIndex],
            description: this.mapWeatherCodeToDescription(response.daily!.weather_code[dayIndex]),
            iconName: this.mapWeatherCodeToIcon(response.daily!.weather_code[dayIndex])
          },
          precipitationChance: response.daily!.precipitation_probability_max ? response.daily!.precipitation_probability_max[dayIndex] : undefined
        };
      });
    }

    return {
      location: {
        latitude: response.latitude,
        longitude: response.longitude,
        timezone: response.timezone
      },
      temperature: {
        current: Math.round(response.current.temperature_2m),
        feelsLike: response.current.apparent_temperature ? Math.round(response.current.apparent_temperature) : undefined,
        // Include today's min/max if available
        min: response.daily?.temperature_2m_min ? Math.round(response.daily.temperature_2m_min[0]) : undefined,
        max: response.daily?.temperature_2m_max ? Math.round(response.daily.temperature_2m_max[0]) : undefined
      },
      conditions: {
        description: this.mapWeatherCodeToDescription(weatherCode),
        code: weatherCode,
        iconName: this.mapWeatherCodeToIcon(weatherCode)
      },
      metrics: {
        humidity: response.current.relative_humidity_2m,
        windSpeed: response.current.wind_speed_10m,
        pressure: response.current.surface_pressure
      },
      timestamps: {
        lastUpdated: response.current.time
      },
      // Add forecast data to the weather data
      forecast: dailyForecast
    };
  }

  /**
   * Get current weather for user's current location
   * Uses PlacesService to get location then fetches weather data
   * @returns Observable<WeatherData>
   */
  getCurrentWeatherForCurrentLocation(): Observable<WeatherData> {
    return from(this.placesService.getCurrentLocation()).pipe(
      switchMap((location) => {
        if (!location) {
          // Fallback to default location (Iloilo City, Philippines)
          return this.getCurrentWeather(10.6953, 122.5442);
        }
        return this.getCurrentWeather(location.lat, location.lng);
      }),
      catchError((error) => {
        console.warn('Failed to get current location, using default:', error);
        // Fallback to default location on error
        return this.getCurrentWeather(10.6953, 122.5442);
      })
    );
  }

  /**
   * Get weather data with fallback location strategy
   * Tries user location first, falls back to provided coordinates, then to default
   * @param fallbackLat - Fallback latitude
   * @param fallbackLng - Fallback longitude
   * @returns Observable<WeatherData>
   */
  getWeatherWithFallback(fallbackLat?: number, fallbackLng?: number): Observable<WeatherData> {
    return from(this.placesService.getCurrentLocation()).pipe(
      switchMap((location) => {
        if (location) {
          return this.getCurrentWeather(location.lat, location.lng);
        } else if (fallbackLat && fallbackLng) {
          return this.getCurrentWeather(fallbackLat, fallbackLng);
        } else {
          // Default location: Iloilo City, Philippines
          return this.getCurrentWeather(10.6953, 122.5442);
        }
      }),
      catchError((error) => {
        console.warn('Location services failed, using fallback:', error);
        if (fallbackLat && fallbackLng) {
          return this.getCurrentWeather(fallbackLat, fallbackLng);
        }
        // Final fallback to default location
        return this.getCurrentWeather(10.6953, 122.5442);
      })
    );
  }

  /**
   * Get day name from date string
   * @param dateString - Date in YYYY-MM-DD format
   * @returns Day name (Today, Tomorrow, or day of week)
   */
  private getDayName(dateString: string): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const date = new Date(dateString);

    // Format dates to compare (YYYY-MM-DD)
    const todayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    const tomorrowStr = tomorrow.getFullYear() + '-' +
      String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' +
      String(tomorrow.getDate()).padStart(2, '0');

    if (dateString === todayStr) {
      return 'Today';
    } else if (dateString === tomorrowStr) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
  }

  /**
   * Map WMO weather interpretation codes to human-readable descriptions
   * @param code - WMO weather code
   * @returns Weather description string
   */
  mapWeatherCodeToDescription(code: number): string {
    const weatherCodes: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };

    return weatherCodes[code] || 'Unknown weather condition';
  }

  /**
   * Map WMO weather interpretation codes to appropriate Ionic icons
   * Note: This method provides legacy Ionic icon support.
   * The weather widget now uses custom SVG icons via the iconType getter.
   * @param code - WMO weather code
   * @returns Ionic icon name string
   */
  mapWeatherCodeToIcon(code: number): string {
    if (code === 0) return 'sunny-outline';
    if (code >= 1 && code <= 2) return 'partly-sunny-outline';
    if (code === 3) return 'cloudy-outline';
    if (code >= 45 && code <= 48) return 'eye-off-outline'; // Fog
    if (code >= 51 && code <= 57) return 'rainy-outline'; // Drizzle
    if (code >= 61 && code <= 67) return 'rainy-outline'; // Rain
    if (code >= 71 && code <= 77) return 'snow-outline'; // Snow
    if (code >= 80 && code <= 82) return 'rainy-outline'; // Rain showers
    if (code >= 85 && code <= 86) return 'snow-outline'; // Snow showers
    if (code >= 95 && code <= 99) return 'thunderstorm-outline'; // Thunderstorm

    return 'help-outline'; // Default for unknown codes
  }

  /**
   * Handle HTTP errors with user-friendly messages and network awareness
   * @param error - HttpErrorResponse or Error
   * @returns Observable error
   */
  private handleError(error: HttpErrorResponse | Error): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    const networkStatus = this.networkService.getCurrentNetworkStatus();
    const connectionQuality = this.networkService.getCurrentConnectionQuality();

    // Handle timeout errors
    if (error.name === 'TimeoutError') {
      if (connectionQuality.quality === 'offline') {
        errorMessage = 'No internet connection. Please check your network and try again.';
      } else if (connectionQuality.quality === 'poor') {
        errorMessage = 'Slow internet connection. Weather data request timed out.';
      } else {
        errorMessage = 'Weather service is taking too long to respond. Please try again.';
      }
    }
    // Handle HTTP errors
    else if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        if (!networkStatus.online) {
          errorMessage = 'No internet connection. Please connect to the internet and try again.';
        } else {
          errorMessage = `Network error: ${error.error.message}`;
        }
      } else {
        // Backend returned an unsuccessful response code
        switch (error.status) {
          case 0:
            if (!networkStatus.online) {
              errorMessage = 'No internet connection detected. Please check your network settings.';
            } else {
              errorMessage = 'Unable to connect to weather service. Please check your internet connection.';
            }
            break;
          case 400:
            errorMessage = 'Invalid location coordinates provided.';
            break;
          case 429:
            errorMessage = 'Weather service rate limit exceeded. Please try again in a few minutes.';
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage = 'Weather service is temporarily unavailable. Please try again later.';
            break;
          default:
            errorMessage = `Weather service error: ${error.status} - ${error.message}`;
        }
      }
    }
    // Handle other errors
    else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Add connection quality context to error message
    if (networkStatus.online && connectionQuality.quality === 'poor') {
      errorMessage += ' Your connection appears to be slow, which may affect weather updates.';
    }

    console.error('Weather service error:', error, 'Network status:', networkStatus, 'Connection quality:', connectionQuality);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Clear all cached weather data
   */
  clearCache(): void {
    this.weatherCache.clear();
    console.log('Weather cache cleared');
  }

  /**
   * Get cache status information
   * @returns Cache status object
   */
  getCacheStatus(): { entries: number; timeout: number } {
    return {
      entries: this.weatherCache.size,
      timeout: this.cacheTimeout
    };
  }

  /**
   * Check if specific coordinates are cached
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns True if cached and not expired
   */
  isCached(latitude: number, longitude: number): boolean {
    return this.getCachedWeather(latitude, longitude) !== null;
  }
}