# Google Places Autocomplete Implementation

This document outlines the implementation of Google Places Autocomplete functionality for the location input in the create-event page.

## Overview

The implementation provides enhanced user experience for location input by:
- **Places Autocomplete**: Real-time search suggestions as users type
- **Current Location**: GPS-based location detection with address lookup
- **Fallback Support**: Manual text input when Google Places API is unavailable
- **Mobile Optimized**: Touch-friendly interface optimized for mobile devices
- **Theme Integration**: Seamlessly integrated with the existing "Asphalt UI" theme

## Features Implemented

### 1. Google Places Service (`src/app/service/places.service.ts`)
- Dynamic loading of Google Maps JavaScript API
- Places Autocomplete search functionality
- Place details retrieval with coordinates
- Reverse geocoding (coordinates to address)
- Current location detection using browser geolocation
- Graceful fallback when API is unavailable

### 2. Places Autocomplete Component (`src/app/components/places-autocomplete/`)
- Reusable Angular component with FormControl integration
- Real-time search with debouncing to optimize API calls
- Popover-based suggestions display
- "Use Current Location" button
- Loading states and error handling
- Responsive mobile design

### 3. Integration with Create Event Page
- Seamless integration with existing reactive forms
- Enhanced location input with autocomplete functionality
- Event handlers for location selection and clearing
- Styled to match the existing Asphalt UI theme

## Setup Instructions

### Step 1: Google Maps API Key Setup

1. **Get a Google Maps API Key**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API (New)
     - Geocoding API
   - Create credentials (API Key) with appropriate restrictions

2. **Configure API Key in Environment Files**:

   Update `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:4201/api',
     facebookAppId: '1515940283108537',
     googleMapsApiKey: 'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE' // Replace this
   };
   ```

   Update `src/environments/environment.prod.ts`:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://motoclub-connect-backend.onrender.com/api',
     facebookAppId: '1515940283108537',
     googleMapsApiKey: 'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE' // Replace this
   };
   ```

### Step 2: API Key Security

**Important Security Considerations**:

1. **Restrict API Key Usage**:
   - In Google Cloud Console, set HTTP referrer restrictions
   - For development: `http://localhost:8100/*`
   - For production: `https://yourdomain.com/*`

2. **Limit API Usage**:
   - Set quotas to prevent unexpected charges
   - Monitor usage in Google Cloud Console

3. **Environment Variables** (Recommended for production):
   - Use build-time environment variable injection
   - Never commit real API keys to version control

### Step 3: Dependencies

The following dependencies are already installed:
- `@types/google.maps` - TypeScript definitions for Google Maps API
- Standard Angular and Ionic dependencies

### Step 4: Testing the Implementation

1. **Start the development server**:
   ```bash
   cd motoclub-connect-ionic
   npm run dev
   ```

2. **Navigate to Create Event page**:
   - Log in to the app
   - Select a club
   - Go to "Create Event"

3. **Test the location functionality**:
   - Type in the location field to see autocomplete suggestions
   - Try the "Use Current Location" button (requires HTTPS in production)
   - Verify fallback behavior when API key is not configured

## File Structure

```
src/app/
├── service/
│   └── places.service.ts                 # Google Places API service
├── components/
│   └── places-autocomplete/
│       ├── places-autocomplete.component.ts
│       ├── places-autocomplete.component.html
│       ├── places-autocomplete.component.scss
│       └── places-autocomplete.module.ts
└── pages/events/create-event/
    ├── create-event.page.html            # Updated with autocomplete
    ├── create-event.page.ts              # Updated with event handlers
    ├── create-event.page.scss            # Updated with theme integration
    └── create-event.module.ts            # Updated with component import
```

## Usage Examples

### Basic Usage in Any Form

```typescript
// In your component
locationControl = new FormControl('');

// In template
<app-places-autocomplete
  [formControl]="locationControl"
  placeholder="Enter location"
  (placeSelected)="onPlaceSelected($event)"
  (locationCleared)="onLocationCleared()">
</app-places-autocomplete>
```

### With Custom Configuration

```typescript
<app-places-autocomplete
  [formControl]="locationControl"
  placeholder="Meeting location or ride destination"
  icon="location-outline"
  [showCurrentLocationButton]="true"
  (placeSelected)="onPlaceSelected($event)"
  (locationCleared)="onLocationCleared()">
</app-places-autocomplete>
```

### Handling Place Selection

```typescript
onPlaceSelected(place: PlaceResult) {
  console.log('Selected place:', place.description);
  
  if (place.geometry?.location) {
    console.log('Coordinates:', place.geometry.location.lat, place.geometry.location.lng);
  }
  
  // Store additional details if needed
  this.selectedPlaceDetails = place;
}
```

## API Usage and Limitations

### Places Autocomplete Service
- **Rate Limits**: Google imposes request quotas
- **Pricing**: Pay-per-request model
- **Geographic Restrictions**: Currently set to US (`componentRestrictions: { country: 'us' }`)

### Geolocation
- **HTTPS Required**: Current location only works on HTTPS in production
- **Permission Required**: Users must grant location access
- **Fallback**: Provides coordinate strings if reverse geocoding fails

## Customization Options

### Search Behavior
In `places.service.ts`, modify the request parameters:

```typescript
const request: any = {
  input: input,
  types: ['establishment', 'geocode'], // Modify search types
  componentRestrictions: { country: 'us' }, // Change country restriction
  // Add other restrictions like bounds, etc.
};
```

### Styling
The component uses CSS custom properties for theming. Modify in `create-event.page.scss`:

```scss
app-places-autocomplete {
  ::ng-deep .current-location-button {
    --color: your-color;
    --border-color: your-border-color;
  }
}
```

## Troubleshooting

### Common Issues

1. **"Places API not available" message**:
   - Check API key configuration
   - Verify Places API is enabled in Google Cloud Console
   - Check browser console for API loading errors

2. **No autocomplete suggestions**:
   - Verify API key has Places API access
   - Check network requests in browser dev tools
   - Ensure proper API key restrictions

3. **Current location not working**:
   - Test on HTTPS (required for geolocation)
   - Check browser location permissions
   - Verify Geocoding API is enabled for reverse lookup

4. **Build errors**:
   - Ensure `@types/google.maps` is installed
   - Check TypeScript compilation errors
   - Verify all imports are correct

### Development vs Production

**Development**:
- Uses `http://localhost:8100`
- Relaxed CORS policies
- Console logging enabled

**Production**:
- Requires HTTPS for geolocation
- Stricter API key restrictions
- Consider implementing usage monitoring

## Performance Considerations

1. **API Call Optimization**:
   - 300ms debouncing on input
   - Minimum 2 characters before searching
   - Caching of recent searches (not implemented yet)

2. **Bundle Size**:
   - Google Maps API loaded dynamically
   - Only loads when component is used
   - No impact on initial app bundle size

## Future Enhancements

Potential improvements that could be implemented:

1. **Caching**: Implement local caching of recent searches
2. **Offline Support**: Store recent locations for offline access
3. **Custom Markers**: Visual map integration for location preview
4. **Multiple Countries**: Dynamic country restriction based on user location
5. **Search History**: Save and suggest previously used locations
6. **Validation**: Enhanced validation for specific location types

## Support and Maintenance

- **API Monitoring**: Regularly check Google Cloud Console for usage
- **Error Tracking**: Implement error tracking for API failures
- **Updates**: Keep `@types/google.maps` updated with Google Maps API changes
- **Testing**: Regular testing across different devices and browsers

---

**Note**: Remember to replace `YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE` with your actual Google Maps API key before deploying to production.