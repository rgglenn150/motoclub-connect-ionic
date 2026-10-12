import { Inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';

/** The parts of `window.history` the service uses; replaced in specs. */
export type BrowserHistory = Pick<History, 'pushState' | 'back' | 'state'>;

export const BROWSER_HISTORY = new InjectionToken<BrowserHistory>('BROWSER_HISTORY', {
  providedIn: 'root',
  factory: () => window.history,
});

export interface DialogLayer {
  id: string;
  /**
   * Back was pressed while this is the top layer. Return true once it is
   * closed; false keeps it open (e.g. a "Discard changes?" prompt was shown).
   */
  onBack: () => boolean;
}

/** How long a popstate caused by our own history.back() is expected (red-team F1). */
const SWALLOW_WINDOW_MS = 1000;

/**
 * Lets Back (browser, hardware or gesture) close in-page dialogs instead of
 * leaving the page (spec 008 Story 2, research R6). Each open dialog gets a
 * same-URL history entry, which the router ignores; popping it closes the
 * top dialog. Generalises the single-modal pattern in club-home to a stack.
 */
@Injectable({ providedIn: 'root' })
export class DialogHistoryService implements OnDestroy {
  /** Open layers, each with the token of the history entry it owns. */
  private stack: { layer: DialogLayer; token: number }[] = [];
  private nextToken = 1;
  /** The entry our own history.back() will land on, and until when to expect it. */
  private ownBack: { token: number | undefined; until: number } | null = null;

  constructor(@Inject(BROWSER_HISTORY) private history: BrowserHistory) {
    window.addEventListener('popstate', this.onPopState);
  }

  ngOnDestroy() {
    window.removeEventListener('popstate', this.onPopState);
  }

  get depth(): number {
    return this.stack.length;
  }

  /** A dialog opened: give Back something to consume. */
  push(layer: DialogLayer) {
    if (this.stack.some((open) => open.layer.id === layer.id)) return;
    this.stack.push({ layer, token: this.pushEntry() });
  }

  /**
   * A dialog closed by other means (close button, backdrop, save). Removes its
   * entry so the next Back leaves the page in one press (FR-010).
   */
  closed(id: string) {
    const index = this.stack.findIndex((open) => open.layer.id === id);
    if (index < 0) return;
    const [{ token }] = this.stack.splice(index, 1);
    if (this.history.state?.mcDialog === token) {
      this.ownBack = { token: this.history.state?.mcBelow, until: Date.now() + SWALLOW_WINDOW_MS };
      this.history.back();
    }
  }

  /** The page is leaving by another route: forget layers, leave history alone (research R7). */
  reset() {
    this.stack = [];
    this.ownBack = null;
  }

  /** Closes any presented alert or action sheet as if cancelled (research R9). */
  async dismissPrompts(): Promise<boolean> {
    const open = presentedPrompts();
    await Promise.all(open.map((el) => el.dismiss(undefined, 'cancel')));
    return open.length > 0;
  }

  private onPopState = (event: PopStateEvent) => {
    const landed: number | undefined = event.state?.mcDialog;
    const own = this.ownBack;
    this.ownBack = null;
    // Entry and time both have to match, so a lost popstate can't swallow a real Back.
    if (own && own.token === landed && Date.now() <= own.until) return;
    // Back moved off the top layer's own entry; anything else isn't ours.
    const top = this.stack[this.stack.length - 1];
    if (!top || landed === top.token) return;

    // A prompt or menu on top closes first; the dialog under it stays.
    if (presentedPrompts().length) {
      this.dismissPrompts();
      top.token = this.pushEntry();
      return;
    }

    this.stack.pop();
    if (!top.layer.onBack()) {
      this.stack.push({ layer: top.layer, token: this.pushEntry() });
    }
  };

  /** Pushes a same-URL entry, keeping the router's state; returns its token. */
  private pushEntry(): number {
    const token = this.nextToken++;
    const below: number | undefined = this.history.state?.mcDialog;
    this.history.pushState({ ...this.history.state, mcDialog: token, mcBelow: below }, '');
    return token;
  }
}

type PromptElement = HTMLElement & { dismiss(data?: unknown, role?: string): Promise<boolean> };

/** Ionic marks overlays that aren't presented with `overlay-hidden`. */
function presentedPrompts(): PromptElement[] {
  return Array.from(document.querySelectorAll<PromptElement>('ion-alert, ion-action-sheet')).filter(
    (el) => !el.classList.contains('overlay-hidden') && typeof el.dismiss === 'function',
  );
}
