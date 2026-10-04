import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { NetworkService, NetworkStatus, ConnectionQuality } from '../../service/network.service';
import { AnimationController } from '@ionic/angular';

@Component({
  selector: 'app-network-indicator',
  templateUrl: './network-indicator.component.html',
  styleUrls: ['./network-indicator.component.scss'],
})
export class NetworkIndicatorComponent implements OnInit, OnDestroy {
  @Input() position: 'top' | 'bottom' | 'inline' = 'top';
  @Input() showWhenOnline: boolean = false;
  @Input() showQuality: boolean = false;
  @Input() compact: boolean = false;

  networkStatus: NetworkStatus = { online: true };
  connectionQuality: ConnectionQuality = {
    quality: 'good',
    description: 'Connected',
    color: 'success',
    icon: 'wifi-outline'
  };

  private networkSubscription?: Subscription;
  private qualitySubscription?: Subscription;
  public isVisible: boolean = false;

  constructor(
    private networkService: NetworkService,
    private animationController: AnimationController
  ) {}

  ngOnInit() {
    this.subscribeToNetworkStatus();
  }

  ngOnDestroy() {
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
    }
    if (this.qualitySubscription) {
      this.qualitySubscription.unsubscribe();
    }
  }

  private subscribeToNetworkStatus() {
    // Subscribe to network status changes
    this.networkSubscription = this.networkService.networkStatus.subscribe(
      status => {
        const previousOnlineStatus = this.networkStatus.online;
        this.networkStatus = status;
        
        // Animate indicator when status changes
        if (previousOnlineStatus !== status.online) {
          this.animateStatusChange(status.online);
        }
        
        this.updateVisibility();
      }
    );

    // Subscribe to connection quality changes
    this.qualitySubscription = this.networkService.connectionQuality.subscribe(
      quality => {
        this.connectionQuality = quality;
        this.updateVisibility();
      }
    );
  }

  private updateVisibility() {
    const shouldShow = this.shouldShowIndicator();
    
    if (shouldShow !== this.isVisible) {
      this.isVisible = shouldShow;
      this.animateVisibility(shouldShow);
    }
  }

  private shouldShowIndicator(): boolean {
    // Always show if offline
    if (!this.networkStatus.online) {
      return true;
    }

    // Show when online if explicitly requested
    if (this.showWhenOnline) {
      return true;
    }

    // Show if connection quality is poor
    if (this.connectionQuality.quality === 'poor') {
      return true;
    }

    return false;
  }

  private animateStatusChange(isOnline: boolean) {
    const element = document.querySelector('.network-indicator');
    if (!element) return;

    // Create bounce animation for status changes
    const animation = this.animationController.create()
      .addElement(element)
      .duration(600)
      .iterations(1);

    if (isOnline) {
      // Online animation - slide in from top and fade in
      animation
        .fromTo('transform', 'translateY(-100%)', 'translateY(0)')
        .fromTo('opacity', '0', '1');
    } else {
      // Offline animation - shake and color change
      animation
        .keyframes([
          { offset: 0, transform: 'translateX(0)' },
          { offset: 0.1, transform: 'translateX(-10px)' },
          { offset: 0.2, transform: 'translateX(10px)' },
          { offset: 0.3, transform: 'translateX(-10px)' },
          { offset: 0.4, transform: 'translateX(10px)' },
          { offset: 0.5, transform: 'translateX(-10px)' },
          { offset: 0.6, transform: 'translateX(10px)' },
          { offset: 1, transform: 'translateX(0)' }
        ]);
    }

    animation.play();
  }

  private animateVisibility(show: boolean) {
    const element = document.querySelector('.network-indicator');
    if (!element) return;

    const animation = this.animationController.create()
      .addElement(element)
      .duration(300)
      .iterations(1);

    if (show) {
      animation
        .fromTo('opacity', '0', '1')
        .fromTo('transform', 'translateY(-20px)', 'translateY(0)');
    } else {
      animation
        .fromTo('opacity', '1', '0')
        .fromTo('transform', 'translateY(0)', 'translateY(-20px)');
    }

    animation.play();
  }

  get indicatorClass(): string {
    const classes = ['network-indicator'];
    
    if (this.position) {
      classes.push(`position-${this.position}`);
    }
    
    if (this.compact) {
      classes.push('compact');
    }
    
    if (!this.isVisible) {
      classes.push('hidden');
    }

    return classes.join(' ');
  }

  get statusText(): string {
    if (!this.networkStatus.online) {
      return 'No Internet Connection';
    }

    if (this.showQuality) {
      return this.connectionQuality.description;
    }

    return 'Connected';
  }

  get statusIcon(): string {
    if (!this.networkStatus.online) {
      return 'cloud-offline-outline';
    }

    return this.connectionQuality.icon;
  }

  get statusColor(): string {
    if (!this.networkStatus.online) {
      return 'danger';
    }

    return this.connectionQuality.color;
  }

  onRefreshConnection() {
    this.networkService.checkConnectivity();
  }
}