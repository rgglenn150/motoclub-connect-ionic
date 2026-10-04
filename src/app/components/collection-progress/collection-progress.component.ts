import { booleanAttribute, Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output } from '@angular/core';
import { formatCurrency } from '@angular/common';

export const NOTE_DISMISSED_KEY = 'mcc.progressNoteDismissed';

export interface ProgressPercents {
  confirmedPct: number;
  pendingPct: number;
}

/**
 * Bar segments as percentages of the target, capped at 100% with confirmed
 * filled first. Same rule as the backend's utils/collectionProgress.js.
 * Returns null when there is no positive target (no bar).
 */
export function progressPercents(confirmed: number, pending: number, target?: number): ProgressPercents | null {
  if (!target || target <= 0) return null;
  const confirmedPct = Math.min(100, (confirmed / target) * 100);
  const pendingPct = Math.min(100 - confirmedPct, (pending / target) * 100);
  return { confirmedPct, pendingPct };
}

/**
 * Two-tone collection progress: confirmed (solid) and pending (tinted) against
 * an optional target, always with text amounts (spec 001, FR-014/FR-015).
 */
@Component({
  selector: 'app-collection-progress',
  templateUrl: './collection-progress.component.html',
  styleUrls: ['./collection-progress.component.scss'],
})
export class CollectionProgressComponent implements OnInit {
  @Input() confirmed = 0;
  @Input() pending = 0;
  @Input() target?: number;
  /** Thin bar and one line of labels, for collection cards. */
  @Input({ transform: booleanAttribute }) compact = false;
  @Input() loading = false;
  @Input() error = false;
  /** Show the dismissible "confirmed vs pending" explanation (FR-018). */
  @Input() showNote = false;
  @Output() retry = new EventEmitter<void>();

  noteDismissed = false;

  constructor(@Inject(LOCALE_ID) private locale: string) {}

  ngOnInit() {
    try {
      this.noteDismissed = localStorage.getItem(NOTE_DISMISSED_KEY) === '1';
    } catch {
      // Storage blocked (private mode, etc.): just show the note.
      this.noteDismissed = false;
    }
  }

  get percents(): ProgressPercents | null {
    return progressPercents(this.confirmed, this.pending, this.target);
  }

  get hasTarget(): boolean {
    return !!this.target && this.target > 0;
  }

  get ariaLabel(): string {
    const parts = [`${this.peso(this.confirmed)} confirmed`];
    if (this.pending > 0) parts.push(`${this.peso(this.pending)} pending`);
    const label = parts.join(', ');
    return this.hasTarget ? `${label} of ${this.peso(this.target!)}` : label;
  }

  round(value: number): number {
    return Math.round(value);
  }

  peso(amount: number): string {
    return formatCurrency(amount || 0, this.locale, '₱', 'PHP', '1.0-2');
  }

  dismissNote() {
    this.noteDismissed = true;
    try {
      localStorage.setItem(NOTE_DISMISSED_KEY, '1');
    } catch {
      // Not persisted; the note stays hidden for this visit only.
    }
  }
}
