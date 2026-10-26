import { Injectable, OnDestroy } from '@angular/core';
import { SwUpdate, VersionEvent, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Watches for newly deployed builds and tells the UI when the running app is
 * out of date.
 *
 * The Angular service worker is the version checker: it compares the hash
 * table in the deployed `ngsw.json` against the version it is currently
 * serving, so every deploy is automatically "a new version". What ngsw does
 * NOT do on its own inside an installed iOS PWA is check often enough — the
 * app can stay resident for days without a fresh navigation, so it keeps
 * serving a stale build. This service polls for updates:
 *
 *  - once at startup,
 *  - every time the app becomes visible again (resume from background),
 *  - on an hourly interval while it stays open.
 *
 * When a new version is detected, `updateAvailable$` emits and the root
 * component shows an "Update now" prompt. Applying the update activates the
 * new version and then performs a hard reset (purge ngsw caches + IndexedDB,
 * unregister the service worker, reload) so no stale state can survive.
 */
@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService implements OnDestroy {
  /** How often to re-check for a deploy while the app stays open. */
  private static readonly CHECK_INTERVAL_MS = 60 * 60 * 1000;

  private readonly updateAvailableSubject = new BehaviorSubject<boolean>(false);

  /** Emits `true` when a newer build is deployed but not yet activated. */
  readonly updateAvailable$ = this.updateAvailableSubject.asObservable();

  private pollSubscription?: Subscription;
  private versionEventsSubscription?: Subscription;
  private watching = false;

  constructor(private swUpdate: SwUpdate) {}

  /**
   * Begin watching for deploys. Idempotent; call once from `AppComponent`.
   */
  startWatching(): void {
    if (!this.swUpdate.isEnabled || this.watching) {
      return;
    }
    this.watching = true;

    this.versionEventsSubscription = this.swUpdate.versionUpdates
      .pipe(
        filter((evt: VersionEvent): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      )
      .subscribe((evt) => {
        console.log('[pwa-update] new version ready:', evt.latestVersion.hash);
        this.updateAvailableSubject.next(true);
      });

    // A PWA that slept through several deploys can end up in a state the old
    // service worker cannot recover from; hard-reset instead of showing a
    // broken app.
    this.swUpdate.unrecoverable.subscribe(() => {
      void this.applyUpdate();
    });

    void this.checkForUpdate();
    this.pollSubscription = timer(
      PwaUpdateService.CHECK_INTERVAL_MS,
      PwaUpdateService.CHECK_INTERVAL_MS,
    ).subscribe(() => {
      void this.checkForUpdate();
    });

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /**
   * Ask the service worker to compare the deployed `ngsw.json` against the
   * version it is serving. The outcome is surfaced through `updateAvailable$`.
   */
  async checkForUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      return;
    }
    try {
      await this.swUpdate.checkForUpdate();
    } catch (err) {
      console.error('[pwa-update] update check failed', err);
    }
  }

  /**
   * Activate the new version, then hard-reset so no stale service-worker
   * state can survive the update (this is what actually fixes iOS PWAs
   * that keep serving an old build).
   */
  async applyUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } catch (err) {
      console.error('[pwa-update] activateUpdate failed; hard reset anyway', err);
    }
    await this.hardReset();
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
    this.versionEventsSubscription?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.checkForUpdate();
    }
  };

  /**
   * Purge everything the Angular service worker owns (caches, IndexedDB
   * manifest state, registration) and reload so the next load fetches the
   * fresh build straight from the network and re-registers a new worker.
   */
  private async hardReset(): Promise<void> {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('ngsw'))
            .map((key) => caches.delete(key)),
        );
      }
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }
      if (typeof indexedDB.databases === 'function') {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases
            .map((db) => db.name)
            .filter((name): name is string => !!name && name.startsWith('ngsw'))
            .map((name) => this.dropDatabase(name)),
        );
      }
    } catch (err) {
      console.error('[pwa-update] cache cleanup failed; reloading anyway', err);
    }
    window.location.reload();
  }

  private dropDatabase(name: string): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  }
}
