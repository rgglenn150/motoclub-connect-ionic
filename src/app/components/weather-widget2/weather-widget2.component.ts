import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../../service/weather.service'; // Import the weather service
import { WeatherData } from '../../models/weather.model'; // Import the shared WeatherData model

// Represents the evaluated verdict for the rider
interface RidingConditions {
  verdict: 'Great' | 'Caution' | 'Poor';
  title: string;
  advice: string;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-weather-widget2',
  templateUrl: './weather-widget2.component.html',
  styleUrls: ['./weather-widget2.component.scss'],
})
export class WeatherWidget2Component implements OnInit {

  // --- Properties ---
  public isLoading: boolean = true;
  public hasError: boolean = false;
  public errorMessage: string = '';

  public currentWeather!: WeatherData;
  public ridingConditions!: RidingConditions;
  public lastUpdated: Date = new Date();

  constructor(private weatherService: WeatherService) { } // Inject the service

  ngOnInit() {
    this.fetchWeatherData();
  }

  /**
   * Fetches weather data using the WeatherService and updates component state.
   */
  public fetchWeatherData(): void {
    this.isLoading = true;
    this.hasError = false;

    // Use the service to get weather for the user's current location
    this.weatherService.getCurrentWeatherForCurrentLocation().subscribe({
      next: (data) => {
        this.currentWeather = data;
        this.ridingConditions = this.evaluateRidingConditions(data);
        this.lastUpdated = new Date(); // Use current time for "last updated"
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch weather data:', err);
        this.errorMessage = err.message || 'Could not load weather. Please try again.';
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  /**
   * Analyzes real weather data to determine if it's a good day to ride.
   * @param weather - The WeatherData object from the service.
   * @returns A RidingConditions object with a verdict and advice.
   */
  private evaluateRidingConditions(weather: WeatherData): RidingConditions {
    const todayForecast = weather.forecast ? weather.forecast[0] : null;
    const chanceOfRain = todayForecast?.precipitationChance ?? 0;

    // POOR conditions: High chance of rain or dangerous weather
    if (chanceOfRain > 40 || weather.conditions.code >= 80) { // WMO codes for showers/thunderstorms
      return {
        verdict: 'Poor',
        title: 'Not a Good Day to Ride',
        advice: 'High chance of rain. Grab your raincoat if you must go!',
        icon: 'rainy',
        colorClass: 'condition-poor'
      };
    }

    // CAUTION conditions: Strong wind, extreme heat, or fog
    if (weather.metrics.windSpeed && weather.metrics.windSpeed > 35) {
      return {
        verdict: 'Caution',
        title: 'Ride With Caution',
        advice: 'Strong winds expected. Be mindful of crosswinds.',
        icon: 'flag',
        colorClass: 'condition-caution'
      };
    }

    if (weather.temperature.feelsLike && weather.temperature.feelsLike > 34) {
      return {
        verdict: 'Caution',
        title: 'Ride With Caution',
        advice: 'It\'s extremely hot. Stay hydrated and take breaks.',
        icon: 'thermometer',
        colorClass: 'condition-caution'
      };
    }

    if (weather.conditions.code >= 45 && weather.conditions.code <= 48) { // WMO codes for Fog
       return {
        verdict: 'Caution',
        title: 'Ride With Caution',
        advice: 'Foggy conditions ahead. Visibility may be low.',
        icon: 'eye-off',
        colorClass: 'condition-caution'
      };
    }

    // GREAT conditions: If no major issues are found
    return {
      verdict: 'Great',
      title: 'Great Day for a Ride!',
      advice: 'Weather is clear. Enjoy the open road!',
      icon: 'sparkles',
      colorClass: 'condition-great'
    };
  }
}