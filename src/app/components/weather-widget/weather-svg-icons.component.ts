import { Component, Input, OnInit, OnChanges } from '@angular/core';

@Component({
  selector: 'app-weather-svg-icon',
  template: `
    <div class="weather-icon" [ngClass]="iconClass" [attr.role]="'img'" [attr.aria-label]="ariaLabel">
      <ng-container [ngSwitch]="iconType">

        <!-- Sunny/Clear Sky Icon -->
        <svg *ngSwitchCase="'sunny'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <g class="sun-rays">
            <!-- Sun rays -->
            <line x1="32" y1="8" x2="32" y2="12" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
            <line x1="32" y1="52" x2="32" y2="56" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
            <line x1="8" y1="32" x2="12" y2="32" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
            <line x1="52" y1="32" x2="56" y2="32" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
            <line x1="14.1" y1="14.1" x2="16.9" y2="16.9" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
            <line x1="47.1" y1="47.1" x2="49.9" y2="49.9" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
            <line x1="49.9" y1="14.1" x2="47.1" y2="16.9" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
            <line x1="16.9" y1="47.1" x2="14.1" y2="49.9" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
          </g>
          <circle class="sun-core" cx="32" cy="32" r="12" fill="#FFD700"/>
        </svg>

        <!-- Partly Cloudy Icon -->
        <svg *ngSwitchCase="'partly-cloudy'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle class="sun-behind" cx="45" cy="20" r="8" fill="#FFD700" opacity="0.8"/>
          <path class="cloud" d="M20,40 Q16,36 20,32 Q24,28 28,32 Q32,28 36,32 Q40,28 44,32 Q48,36 44,40 Q48,44 44,48 Q40,52 36,48 Q32,52 28,48 Q24,52 20,48 Q16,44 20,40 Z" fill="#E0E0E0"/>
          <path class="cloud-shadow" d="M22,42 Q18,38 22,34 Q26,30 30,34 Q34,30 38,34 Q42,30 46,34 Q50,38 46,42 Q50,46 46,50 Q42,54 38,50 Q34,54 30,50 Q26,54 22,50 Q18,46 22,42 Z" fill="#C0C0C0" opacity="0.6"/>
        </svg>

        <!-- Cloudy/Overcast Icon -->
        <svg *ngSwitchCase="'cloudy'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path class="cloud-1" d="M12,35 Q8,31 12,27 Q16,23 20,27 Q24,23 28,27 Q32,23 36,27 Q40,31 36,35 Q40,39 36,43 Q32,47 28,43 Q24,47 20,43 Q16,47 12,43 Q8,39 12,35 Z" fill="#B0B0B0"/>
          <path class="cloud-2" d="M28,40 Q24,36 28,32 Q32,28 36,32 Q40,28 44,32 Q48,28 52,32 Q56,36 52,40 Q56,44 52,48 Q48,52 44,48 Q40,52 36,48 Q32,52 28,48 Q24,44 28,40 Z" fill="#D0D0D0"/>
          <path class="cloud-3" d="M16,28 Q12,24 16,20 Q20,16 24,20 Q28,16 32,20 Q36,16 40,20 Q44,24 40,28 Q44,32 40,36 Q36,40 32,36 Q28,40 24,36 Q20,40 16,36 Q12,32 16,28 Z" fill="#C8C8C8"/>
        </svg>

        <!-- Fog/Mist Icon -->
        <svg *ngSwitchCase="'fog'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <line class="fog-line" x1="8" y1="20" x2="56" y2="20" stroke="#A0A0A0" stroke-width="3"/>
          <line class="fog-line" x1="12" y1="28" x2="52" y2="28" stroke="#A0A0A0" stroke-width="3"/>
          <line class="fog-line" x1="8" y1="36" x2="56" y2="36" stroke="#A0A0A0" stroke-width="3"/>
          <line class="fog-line" x1="16" y1="44" x2="48" y2="44" stroke="#A0A0A0" stroke-width="3"/>
        </svg>

        <!-- Rain/Drizzle Icon -->
        <svg *ngSwitchCase="'rain'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path class="cloud" d="M16,30 Q12,26 16,22 Q20,18 24,22 Q28,18 32,22 Q36,18 40,22 Q44,18 48,22 Q52,26 48,30 Q52,34 48,38 Q44,42 40,38 Q36,42 32,38 Q28,42 24,38 Q20,42 16,38 Q12,34 16,30 Z" fill="#708090"/>
          <ellipse class="rain-drop" cx="20" cy="45" rx="1.5" ry="4" fill="#4682B4"/>
          <ellipse class="rain-drop" cx="28" cy="48" rx="1.5" ry="4" fill="#4682B4"/>
          <ellipse class="rain-drop" cx="36" cy="46" rx="1.5" ry="4" fill="#4682B4"/>
          <ellipse class="rain-drop" cx="44" cy="49" rx="1.5" ry="4" fill="#4682B4"/>
        </svg>

        <!-- Heavy Rain/Showers Icon -->
        <svg *ngSwitchCase="'showers'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path class="cloud" d="M14,28 Q10,24 14,20 Q18,16 22,20 Q26,16 30,20 Q34,16 38,20 Q42,16 46,20 Q50,24 46,28 Q50,32 46,36 Q42,40 38,36 Q34,40 30,36 Q26,40 22,36 Q18,40 14,36 Q10,32 14,28 Z" fill="#2F4F4F"/>
          <ellipse class="rain-drop" cx="18" cy="43" rx="1.5" ry="5" fill="#1E90FF"/>
          <ellipse class="rain-drop" cx="24" cy="46" rx="1.5" ry="5" fill="#1E90FF"/>
          <ellipse class="rain-drop" cx="30" cy="44" rx="1.5" ry="5" fill="#1E90FF"/>
          <ellipse class="rain-drop" cx="36" cy="47" rx="1.5" ry="5" fill="#1E90FF"/>
          <ellipse class="rain-drop" cx="42" cy="45" rx="1.5" ry="5" fill="#1E90FF"/>
        </svg>

        <!-- Snow Icon -->
        <svg *ngSwitchCase="'snow'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path class="cloud" d="M16,30 Q12,26 16,22 Q20,18 24,22 Q28,18 32,22 Q36,18 40,22 Q44,18 48,22 Q52,26 48,30 Q52,34 48,38 Q44,42 40,38 Q36,42 32,38 Q28,42 24,38 Q20,42 16,38 Q12,34 16,30 Z" fill="#F0F8FF"/>
          <g class="snowflake" transform="translate(20,45)">
            <line x1="-3" y1="0" x2="3" y2="0" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="-2" y1="-2" x2="2" y2="2" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="-2" y1="2" x2="2" y2="-2" stroke="#FFFFFF" stroke-width="1"/>
          </g>
          <g class="snowflake" transform="translate(32,48)">
            <line x1="-3" y1="0" x2="3" y2="0" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="-2" y1="-2" x2="2" y2="2" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="-2" y1="2" x2="2" y2="-2" stroke="#FFFFFF" stroke-width="1"/>
          </g>
          <g class="snowflake" transform="translate(44,46)">
            <line x1="-3" y1="0" x2="3" y2="0" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="-2" y1="-2" x2="2" y2="2" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="-2" y1="2" x2="2" y2="-2" stroke="#FFFFFF" stroke-width="1"/>
          </g>
          <g class="snowflake" transform="translate(26,43)">
            <line x1="-2" y1="0" x2="2" y2="0" stroke="#FFFFFF" stroke-width="1"/>
            <line x1="0" y1="-2" x2="0" y2="2" stroke="#FFFFFF" stroke-width="1"/>
          </g>
        </svg>

        <!-- Thunderstorm Icon -->
        <svg *ngSwitchCase="'thunderstorm'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path class="cloud" d="M14,28 Q10,24 14,20 Q18,16 22,20 Q26,16 30,20 Q34,16 38,20 Q42,16 46,20 Q50,24 46,28 Q50,32 46,36 Q42,40 38,36 Q34,40 30,36 Q26,40 22,36 Q18,40 14,36 Q10,32 14,28 Z" fill="#2C3E50"/>
          <path class="lightning" d="M28,38 L32,30 L30,30 L34,22 L30,28 L32,28 L28,36 Z" fill="#FFD700"/>
          <path class="lightning" d="M38,40 L42,32 L40,32 L44,24 L40,30 L42,30 L38,38 Z" fill="#FFD700"/>
          <ellipse class="rain-drop" cx="20" cy="44" rx="1" ry="3" fill="#87CEEB"/>
          <ellipse class="rain-drop" cx="32" cy="47" rx="1" ry="3" fill="#87CEEB"/>
          <ellipse class="rain-drop" cx="44" cy="45" rx="1" ry="3" fill="#87CEEB"/>
        </svg>

        <!-- Default/Unknown Weather Icon -->
        <svg *ngSwitchDefault viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="20" fill="none" stroke="#888888" stroke-width="2"/>
          <text class="question-mark" x="32" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#888888">?</text>
        </svg>

        <!-- Loading state -->
        <svg *ngSwitchCase="'loading'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle class="loading-circle" cx="32" cy="32" r="20" fill="none" stroke="#888888" stroke-width="4" stroke-dasharray="31.416" stroke-dashoffset="31.416"/>
        </svg>

        <!-- Error state -->
        <svg *ngSwitchCase="'error'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="20" fill="none" stroke="#FF6B6B" stroke-width="2"/>
          <line class="error-symbol" x1="24" y1="24" x2="40" y2="40" stroke="#FF6B6B" stroke-width="3" stroke-linecap="round"/>
          <line class="error-symbol" x1="40" y1="24" x2="24" y2="40" stroke="#FF6B6B" stroke-width="3" stroke-linecap="round"/>
        </svg>

      </ng-container>
    </div>
  `,
  styleUrls: ['./weather-icons.scss']
})
export class WeatherSvgIconComponent implements OnInit, OnChanges {
  @Input() iconType: string = 'default';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() animated: boolean = true;

  iconClass: string = '';
  ariaLabel: string = '';

  ngOnInit(): void {
    this.updateIconClass();
    this.updateAriaLabel();
  }

  ngOnChanges(): void {
    this.updateIconClass();
    this.updateAriaLabel();
  }

  private updateIconClass(): void {
    const baseClass = `weather-icon-${this.iconType}`;
    const sizeClass = `weather-icon-${this.size}`;
    const animationClass = this.animated ? 'weather-icon-animated' : 'weather-icon-static';

    this.iconClass = `${baseClass} ${sizeClass} ${animationClass}`;
  }

  private updateAriaLabel(): void {
    const labels: { [key: string]: string } = {
      'sunny': 'Clear sunny weather',
      'partly-cloudy': 'Partly cloudy weather',
      'cloudy': 'Cloudy weather',
      'fog': 'Foggy weather',
      'rain': 'Rainy weather',
      'showers': 'Heavy rain showers',
      'snow': 'Snowy weather',
      'thunderstorm': 'Thunderstorm weather',
      'loading': 'Loading weather data',
      'error': 'Weather data error',
      'default': 'Unknown weather condition'
    };

    this.ariaLabel = labels[this.iconType] || labels['default'];
  }
}