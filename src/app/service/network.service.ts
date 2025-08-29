import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map, startWith, distinctUntilChanged } from 'rxjs/operators';

export interface NetworkStatus {
  online: boolean;
  connectionType?: string;
  downlink?: number; // Network speed estimate in Mbps
  effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
  saveData?: boolean;
  rtt?: number; // Round-trip time in milliseconds
}

export interface ConnectionQuality {
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  description: string;
  color: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private networkStatus$ = new BehaviorSubject<NetworkStatus>({ online: navigator.onLine });
  private connectionQuality$ = new BehaviorSubject<ConnectionQuality>(this.getConnectionQuality());
  
  // Observable for components to subscribe to network status changes
  public networkStatus: Observable<NetworkStatus> = this.networkStatus$.asObservable();
  public connectionQuality: Observable<ConnectionQuality> = this.connectionQuality$.asObservable();

  constructor() {
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network monitoring using various browser APIs
   */
  private initializeNetworkMonitoring() {
    // Basic online/offline detection
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));
    
    // Combine online/offline events
    merge(online$, offline$)
      .pipe(
        startWith(navigator.onLine),
        distinctUntilChanged()
      )
      .subscribe(online => {
        this.updateNetworkStatus({ online });
      });

    // Network Information API (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      // Listen for network changes
      if (connection && 'addEventListener' in connection) {
        connection.addEventListener('change', () => {
          this.updateNetworkStatusFromConnection();
        });
        
        // Initial update
        this.updateNetworkStatusFromConnection();
      }
    }

    // Periodic connectivity check for better reliability
    this.startConnectivityCheck();
  }

  /**
   * Update network status from Navigator Connection API
   */
  private updateNetworkStatusFromConnection() {
    if (!('connection' in navigator)) return;
    
    const connection = (navigator as any).connection;
    const status: NetworkStatus = {
      online: navigator.onLine,
      connectionType: connection.type || connection.effectiveType,
      downlink: connection.downlink,
      effectiveType: connection.effectiveType,
      saveData: connection.saveData,
      rtt: connection.rtt
    };

    this.updateNetworkStatus(status);
  }

  /**
   * Update network status and trigger quality assessment
   */
  private updateNetworkStatus(status: NetworkStatus) {
    this.networkStatus$.next(status);
    this.connectionQuality$.next(this.getConnectionQuality(status));
  }

  /**
   * Determine connection quality based on network metrics
   */
  private getConnectionQuality(status?: NetworkStatus): ConnectionQuality {
    const currentStatus = status || this.networkStatus$.value;
    
    if (!currentStatus.online) {
      return {
        quality: 'offline',
        description: 'No internet connection',
        color: 'danger',
        icon: 'cloud-offline-outline'
      };
    }

    // If we have detailed network info, use it
    if (currentStatus.effectiveType && currentStatus.rtt && currentStatus.downlink) {
      const rtt = currentStatus.rtt;
      const downlink = currentStatus.downlink;
      
      if (currentStatus.effectiveType === '4g' && rtt < 100 && downlink > 10) {
        return {
          quality: 'excellent',
          description: 'Excellent connection',
          color: 'success',
          icon: 'wifi-outline'
        };
      }
      
      if (currentStatus.effectiveType === '4g' && rtt < 200 && downlink > 5) {
        return {
          quality: 'good',
          description: 'Good connection',
          color: 'primary',
          icon: 'wifi-outline'
        };
      }
      
      if (currentStatus.effectiveType === '3g' || (rtt < 500 && downlink > 1)) {
        return {
          quality: 'fair',
          description: 'Fair connection',
          color: 'warning',
          icon: 'cellular-outline'
        };
      }
      
      return {
        quality: 'poor',
        description: 'Slow connection',
        color: 'danger',
        icon: 'cellular-outline'
      };
    }

    // Fallback to basic quality assessment
    return {
      quality: 'good',
      description: 'Connected',
      color: 'success',
      icon: 'wifi-outline'
    };
  }

  /**
   * Start periodic connectivity checks using fetch with timeout
   */
  private startConnectivityCheck() {
    // Check connectivity every 30 seconds when offline, every 2 minutes when online
    const checkInterval = () => {
      const interval = this.networkStatus$.value.online ? 120000 : 30000;
      setTimeout(() => {
        this.checkConnectivity().then(() => {
          checkInterval(); // Schedule next check
        });
      }, interval);
    };

    checkInterval();
  }

  /**
   * Check actual connectivity by making a lightweight network request
   */
  public async checkConnectivity(): Promise<boolean> {
    try {
      // Use a lightweight request to check connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/assets/icon/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const isOnline = response.ok;
      
      // Update status if different from current
      if (isOnline !== this.networkStatus$.value.online) {
        this.updateNetworkStatus({ 
          ...this.networkStatus$.value, 
          online: isOnline 
        });
      }
      
      return isOnline;
    } catch (error) {
      // Network error or timeout - we're offline
      if (this.networkStatus$.value.online) {
        this.updateNetworkStatus({ 
          ...this.networkStatus$.value, 
          online: false 
        });
      }
      return false;
    }
  }

  /**
   * Get current network status synchronously
   */
  public getCurrentNetworkStatus(): NetworkStatus {
    return this.networkStatus$.value;
  }

  /**
   * Get current connection quality synchronously
   */
  public getCurrentConnectionQuality(): ConnectionQuality {
    return this.connectionQuality$.value;
  }

  /**
   * Check if the device is online
   */
  public isOnline(): boolean {
    return this.networkStatus$.value.online;
  }

  /**
   * Check if connection is suitable for heavy operations
   */
  public isConnectionGood(): boolean {
    const quality = this.connectionQuality$.value.quality;
    return quality === 'excellent' || quality === 'good';
  }

  /**
   * Check if user is on a data-saving connection
   */
  public isDataSaver(): boolean {
    return this.networkStatus$.value.saveData || false;
  }

  /**
   * Get estimated timeout for network requests based on connection quality
   */
  public getRecommendedTimeout(): number {
    const quality = this.connectionQuality$.value.quality;
    
    switch (quality) {
      case 'excellent':
        return 10000; // 10 seconds
      case 'good':
        return 15000; // 15 seconds
      case 'fair':
        return 25000; // 25 seconds
      case 'poor':
        return 35000; // 35 seconds
      case 'offline':
        return 5000;  // 5 seconds for quick failure
      default:
        return 15000;
    }
  }

  /**
   * Get recommended retry intervals based on connection quality
   */
  public getRetryIntervals(): number[] {
    const quality = this.connectionQuality$.value.quality;
    
    switch (quality) {
      case 'excellent':
        return [1000, 2000, 4000, 8000]; // 1s, 2s, 4s, 8s
      case 'good':
        return [2000, 4000, 8000, 16000]; // 2s, 4s, 8s, 16s
      case 'fair':
        return [3000, 6000, 12000, 24000]; // 3s, 6s, 12s, 24s
      case 'poor':
        return [5000, 10000, 20000, 40000]; // 5s, 10s, 20s, 40s
      case 'offline':
        return [10000, 20000, 40000]; // 10s, 20s, 40s (fewer retries when offline)
      default:
        return [2000, 4000, 8000, 16000];
    }
  }
}