/**
 * Weather Data Models for Motoclub Connect Ionic Application
 * 
 * This file contains all TypeScript interfaces for weather-related data structures
 * used throughout the application for weather functionality integration.
 */

/**
 * Main interface for components to consume weather data
 * This is the primary interface that components will use to display weather information
 */
export interface WeatherData {
  /** Location information */
  location: {
    /** Human-readable location name */
    name?: string;
    /** Latitude coordinate */
    latitude: number;
    /** Longitude coordinate */
    longitude: number;
    /** Timezone information */
    timezone: string;
  };
  
  /** Current temperature information */
  temperature: {
    /** Current temperature in Celsius */
    current: number;
    /** Feels like temperature in Celsius */
    feelsLike?: number;
    /** Minimum temperature for the day in Celsius */
    min?: number;
    /** Maximum temperature for the day in Celsius */
    max?: number;
  };
  
  /** Weather condition information */
  conditions: {
    /** Human-readable weather description */
    description: string;
    /** WMO weather interpretation code */
    code: number;
    /** Ionic icon name for displaying weather condition */
    iconName: string;
  };
  
  /** Additional weather metrics */
  metrics: {
    /** Relative humidity percentage */
    humidity: number;
    /** Wind speed in km/h */
    windSpeed: number;
    /** Atmospheric pressure in hPa */
    pressure?: number;
    /** Visibility in kilometers */
    visibility?: number;
    /** UV index */
    uvIndex?: number;
  };
  
  /** Timestamp information */
  timestamps: {
    /** When the weather data was last updated */
    lastUpdated: string;
    /** Local time at the weather location */
    localTime?: string;
  };

  /** 3-day forecast data */
  forecast?: ForecastDay[];
}

/**
 * Interface for daily forecast data
 */
export interface ForecastDay {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Human-readable day name (Today, Tomorrow, Mon, Tue, etc.) */
  dayName: string;
  /** Temperature range for the day */
  temperature: {
    /** Minimum temperature in Celsius */
    min: number;
    /** Maximum temperature in Celsius */
    max: number;
  };
  /** Weather conditions for the day */
  conditions: {
    /** WMO weather interpretation code */
    code: number;
    /** Human-readable weather description */
    description: string;
    /** Ionic icon name for displaying weather condition */
    iconName: string;
  };
  /** Precipitation chance percentage (optional) */
  precipitationChance?: number;
}

/**
 * Interface for Open-Meteo API responses
 * Maps directly to the structure returned by the Open-Meteo weather API
 */
export interface WeatherResponse {
  /** Latitude of the location */
  latitude: number;
  /** Longitude of the location */
  longitude: number;
  /** Timezone identifier */
  timezone: string;
  /** Timezone abbreviation */
  timezone_abbreviation: string;
  /** Elevation in meters above sea level */
  elevation: number;
  /** Current weather data from API */
  current: CurrentWeather;
  /** Current weather units */
  current_units?: Record<string, string>;
  /** Hourly forecast data (optional for future use) */
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    [key: string]: any;
  };
  /** Daily forecast data (optional for future use) */
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max?: number[];
    [key: string]: any;
  };
}

/**
 * Current weather conditions from Open-Meteo API
 * Represents the current weather data structure from the API response
 */
export interface CurrentWeather {
  /** Timestamp of the current weather data */
  time: string;
  /** Current temperature in Celsius */
  temperature_2m: number;
  /** Relative humidity percentage */
  relative_humidity_2m: number;
  /** Apparent temperature (feels like) in Celsius */
  apparent_temperature?: number;
  /** Precipitation amount in mm */
  precipitation?: number;
  /** WMO weather interpretation code */
  weather_code: number;
  /** Cloud cover percentage */
  cloud_cover?: number;
  /** Surface pressure in hPa */
  surface_pressure?: number;
  /** Wind speed at 10 meters in km/h */
  wind_speed_10m: number;
  /** Wind direction at 10 meters in degrees */
  wind_direction_10m?: number;
  /** Wind gusts at 10 meters in km/h */
  wind_gusts_10m?: number;
}

/**
 * Additional current weather conditions for extended data
 * Can be used for more detailed weather information when available
 */
export interface CurrentConditions extends CurrentWeather {
  /** Visibility in kilometers */
  visibility?: number;
  /** UV index */
  uv_index?: number;
  /** Solar radiation in W/m² */
  solar_radiation?: number;
  /** Terrestrial radiation in W/m² */
  terrestrial_radiation?: number;
  /** Shortwave radiation in W/m² */
  shortwave_radiation?: number;
  /** Direct normal irradiance in W/m² */
  direct_normal_irradiance?: number;
  /** Diffuse radiation in W/m² */
  diffuse_radiation?: number;
  /** Dewpoint temperature in Celsius */
  dewpoint_2m?: number;
}

/**
 * Interface for future forecast functionality
 * Designed to support hourly and daily forecasts when implemented
 */
export interface WeatherForecast {
  /** Location information */
  location: {
    name?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  
  /** Current weather conditions */
  current: WeatherData;
  
  /** Hourly forecast data */
  hourly?: {
    /** Timestamp for each hour */
    time: string[];
    /** Temperature for each hour */
    temperature: number[];
    /** Weather conditions for each hour */
    conditions: {
      code: number;
      description: string;
      iconName: string;
    }[];
    /** Additional metrics for each hour */
    metrics: {
      humidity: number[];
      windSpeed: number[];
      precipitation?: number[];
    };
  };
  
  /** Daily forecast data */
  daily?: {
    /** Date for each day */
    date: string[];
    /** Temperature range for each day */
    temperature: {
      min: number[];
      max: number[];
    };
    /** Weather conditions for each day */
    conditions: {
      code: number;
      description: string;
      iconName: string;
    }[];
    /** Additional metrics for each day */
    metrics: {
      humidity: number[];
      windSpeed: number[];
      precipitation?: number[];
    };
  };
  
  /** When the forecast was generated */
  generatedAt: string;
}

/**
 * Interface for weather service error handling
 * Provides structured error information for better user experience
 */
export interface WeatherError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Detailed error description for debugging */
  details?: string;
  /** HTTP status code if applicable */
  status?: number;
  /** Timestamp when the error occurred */
  timestamp: string;
  /** Context information about the error */
  context?: {
    /** Location coordinates that caused the error */
    latitude?: number;
    longitude?: number;
    /** API endpoint that failed */
    endpoint?: string;
    /** Request parameters */
    parameters?: Record<string, any>;
  };
}

/**
 * Weather service configuration interface
 * For configuring weather service behavior and API settings
 */
export interface WeatherConfig {
  /** API base URL */
  apiUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts for failed requests */
  retryAttempts: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay: number;
  /** Cache duration for weather data in minutes */
  cacheDuration: number;
  /** Default units for temperature, wind speed, etc. */
  units: {
    temperature: 'celsius' | 'fahrenheit';
    windSpeed: 'kmh' | 'mph' | 'ms';
    pressure: 'hpa' | 'inhg';
  };
}

/**
 * Weather location interface
 * For managing weather locations and favorites
 */
export interface WeatherLocation {
  /** Unique identifier for the location */
  id: string;
  /** Human-readable location name */
  name: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Country code */
  country?: string;
  /** State/region */
  region?: string;
  /** Whether this is a favorite location */
  isFavorite: boolean;
  /** Whether this is the user's current location */
  isCurrentLocation: boolean;
  /** Last time weather was fetched for this location */
  lastFetched?: string;
}

/**
 * Weather cache entry interface
 * For caching weather data to improve performance and reduce API calls
 */
export interface WeatherCacheEntry {
  /** Unique key for the cache entry */
  key: string;
  /** Cached weather data */
  data: WeatherData;
  /** When the data was cached */
  cachedAt: string;
  /** When the cache entry expires */
  expiresAt: string;
  /** Location coordinates for the cached data */
  location: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Weather alert interface
 * For handling weather alerts and warnings (future enhancement)
 */
export interface WeatherAlert {
  /** Alert identifier */
  id: string;
  /** Alert title */
  title: string;
  /** Alert description */
  description: string;
  /** Alert severity level */
  severity: 'info' | 'warning' | 'watch' | 'advisory';
  /** Alert start time */
  startTime: string;
  /** Alert end time */
  endTime: string;
  /** Affected areas */
  areas: string[];
  /** Alert source/issuer */
  source: string;
}

// Type guards for runtime type checking

/**
 * Type guard to check if an object is a valid WeatherData
 */
export function isWeatherData(obj: any): obj is WeatherData {
  return obj &&
    typeof obj === 'object' &&
    obj.location &&
    typeof obj.location.latitude === 'number' &&
    typeof obj.location.longitude === 'number' &&
    obj.temperature &&
    typeof obj.temperature.current === 'number' &&
    obj.conditions &&
    typeof obj.conditions.description === 'string' &&
    obj.metrics &&
    typeof obj.metrics.humidity === 'number';
}

/**
 * Type guard to check if an object is a valid WeatherError
 */
export function isWeatherError(obj: any): obj is WeatherError {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.timestamp === 'string';
}

/**
 * Default weather configuration
 */
export const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  apiUrl: 'https://api.open-meteo.com/v1/forecast',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheDuration: 30, // 30 minutes
  units: {
    temperature: 'celsius',
    windSpeed: 'kmh',
    pressure: 'hpa'
  }
};