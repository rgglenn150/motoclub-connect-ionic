// Example usage of the getNearbyClubs service method
// This file is for documentation purposes only and should be removed before production

import { Component } from '@angular/core';
import { ClubService, NearbyClubsOptions, NearbyClubsResponse } from '../service/club.service';

@Component({
  selector: 'app-nearby-clubs-example',
  template: ''
})
export class NearbyClubsExampleComponent {

  constructor(private clubService: ClubService) {}

  // Example 1: Basic usage with default options
  basicNearbySearch() {
    this.clubService.getNearbyClubs().subscribe({
      next: (response: NearbyClubsResponse) => {
        console.log('Found clubs:', response.clubs);
        console.log('User location:', response.userLocation);
        console.log('Search radius:', response.searchRadius);
      },
      error: (error) => {
        console.error('Error finding nearby clubs:', error);
      }
    });
  }

  // Example 2: Custom search with specific options
  customNearbySearch() {
    const options: NearbyClubsOptions = {
      radius: 25,           // 25km radius
      limit: 10,            // Maximum 10 results
      includePrivate: false, // Only public clubs
      enableHighAccuracy: true, // High GPS accuracy
      useUserLocation: true,
      fallbackCoordinates: {
        latitude: 34.0522,  // Los Angeles as fallback
        longitude: -118.2437
      }
    };

    this.clubService.getNearbyClubs(options).subscribe({
      next: (response: NearbyClubsResponse) => {
        response.clubs.forEach(club => {
          console.log(`${club.clubName}: ${club.distance.formatted} away`);
          console.log(`Members: ${club.memberCount}`);
          console.log(`Description: ${club.description}`);
        });
      },
      error: (error) => {
        console.error('Custom search failed:', error);
      }
    });
  }

  // Example 3: Using specific coordinates (no GPS)
  searchFromSpecificLocation() {
    const options: NearbyClubsOptions = {
      useUserLocation: false,
      fallbackCoordinates: {
        latitude: 40.7128,   // New York City
        longitude: -74.0060
      },
      radius: 100,
      limit: 50
    };

    this.clubService.getNearbyClubs(options).subscribe({
      next: (response: NearbyClubsResponse) => {
        if (response.clubs.length === 0) {
          console.log('No clubs found in the specified area');
        } else {
          console.log(`Found ${response.totalCount} clubs near NYC`);
        }
      },
      error: (error) => {
        console.error('Location-specific search failed:', error);
      }
    });
  }

  // Example 4: Error handling with graceful degradation
  robustNearbySearch() {
    const options: NearbyClubsOptions = {
      radius: 30,
      enableHighAccuracy: true,
      fallbackCoordinates: {
        latitude: 39.7392,   // Denver as fallback
        longitude: -104.9903
      }
    };

    this.clubService.getNearbyClubs(options).subscribe({
      next: (response: NearbyClubsResponse) => {
        // Check location source for user feedback
        switch (response.userLocation.source) {
          case 'gps':
            console.log('Using your current GPS location');
            break;
          case 'cached':
            console.log('Using your recent location');
            break;
          case 'fallback':
            console.log('Using default location (GPS unavailable)');
            break;
        }

        if (response.clubs.length > 0) {
          console.log(`Found ${response.clubs.length} clubs within ${response.searchRadius}km`);
        } else if (response.message) {
          console.log('Info:', response.message);
        }
      },
      error: (error) => {
        // This should rarely happen due to graceful error handling
        console.error('Unexpected error:', error);
      }
    });
  }
}