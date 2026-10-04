/**
 * Mapbox Geocoding API response structure for reverse geocoding
 */
export interface MapboxGeocodingResponse {
  type: string;
  query: [number, number];
  features: MapboxFeature[];
  attribution: string;
}

/**
 * Individual feature from Mapbox Geocoding API response
 */
export interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: {
    accuracy?: string;
    address?: string;
    category?: string;
    maki?: string;
    wikidata?: string;
    short_code?: string;
  };
  text: string;
  place_name: string;
  center: [number, number];
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  context?: MapboxContext[];
}

/**
 * Context information for a place from Mapbox
 */
export interface MapboxContext {
  id: string;
  wikidata?: string;
  short_code?: string;
  text: string;
}

/**
 * Cached geocoding result structure
 */
export interface CachedGeocodingResult {
  address: string;
  timestamp: number;
}