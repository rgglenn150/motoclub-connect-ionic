import { booleanAttribute, Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output } from '@angular/core';
import { formatCurrency } from '@angular/common';
import { paymentStatusLabel } from '../../pipes/payment-status.pipe';

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
  // Clamped at 0 too: a bad stored amount must never draw a negative segment.
  const confirmedPct = Math.max(0, Math.min(100, (confirmed / target) * 100));
  const pendingPct = Math.max(0, Math.min(100 - confirmedPct, (pending / target) * 100));
  return { confirmedPct, pendingPct };
}

export interface ProgressSplit extends ProgressPercents {
  /** Whole-number label shares adding up to 100 ("<1%" for tiny ones); null when nothing is collected. */
  confirmedShare: string | null;
  pendingShare: string | null;
}

/** What the bar measures: toward a positive target, or the split of collected money (spec 007). */
export type ProgressBar = ({ mode: 'target' } & ProgressPercents) | ({ mode: 'split' } & ProgressSplit);

/**
 * Without a target the bar splits the money collected so far into verified and
 * pending (spec 007 D1, research R2). Negative amounts count as 0. Same rule as
 * the backend's utils/collectionProgress.js.
 */
export function progressSplit(confirmed: number, pending: number): ProgressSplit {
  const c = Math.max(0, Number(confirmed) || 0);
  const p = Math.max(0, Number(pending) || 0);
  const total = c + p;
  if (total === 0) return { confirmedPct: 0, pendingPct: 0, confirmedShare: null, pendingShare: null };
  const confirmedPct = (c / total) * 100;
  const pendingPct = 100 - confirmedPct;

  let confirmedWhole = Math.round(confirmedPct);
  if (p > 0 && confirmedWhole === 100) confirmedWhole = 99;
  if (c > 0 && confirmedWhole === 0) confirmedWhole = 1;
  const pendingWhole = 100 - confirmedWhole;
  const share = (amount: number, whole: number, pct: number) => (amount > 0 && pct < 1 ? '<1%' : `${whole}%`);

  return {
    confirmedPct,
    pendingPct,
    confirmedShare: share(c, confirmedWhole, confirmedPct),
    pendingShare: share(p, pendingWhole, pendingPct),
  };
}

export function progressBar(confirmed: number, pending: number, target?: number): ProgressBar {
  const toward = progressPercents(confirmed, pending, target);
  return toward ? { mode: 'target', ...toward } : { mode: 'split', ...progressSplit(confirmed, pending) };
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
  /** Show the dismissible "verified vs pending" explanation (spec 001 FR-018, spec 003 FR-008). */
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

  /** Toward the target, or the verified vs pending split without one (spec 007). */
  get bar(): ProgressBar {
    return progressBar(this.confirmed, this.pending, this.target);
  }

  /** Label shares, split mode only; null when nothing is collected. */
  get shares(): { confirmed: string; pending: string } | null {
    const bar = this.bar;
    if (bar.mode !== 'split' || bar.confirmedShare === null || bar.pendingShare === null) return null;
    return { confirmed: bar.confirmedShare, pending: bar.pendingShare };
  }

  get hasTarget(): boolean {
    return !!this.target && this.target > 0;
  }

  get ariaLabel(): string {
    // Pending first, then verified (spec 003 FR-003).
    const parts: string[] = [];
    if (this.pending > 0) parts.push(`${this.peso(this.pending)} ${paymentStatusLabel('pending', 'lower')}`);
    parts.push(`${this.peso(this.confirmed)} ${paymentStatusLabel('confirmed', 'lower')}`);
    const label = parts.join(', ');
    if (this.hasTarget) return `${label} of ${this.peso(this.target!)}`;
    // Split (spec 007 D4): amounts with their shares, never a completion percentage.
    const shares = this.shares;
    if (!shares) return `Verified vs pending: ${label}`;
    const split: string[] = [];
    if (this.pending > 0) split.push(`${this.peso(this.pending)} ${paymentStatusLabel('pending', 'lower')}, ${shares.pending}`);
    split.push(`${this.peso(this.confirmed)} ${paymentStatusLabel('confirmed', 'lower')}, ${shares.confirmed}`);
    return `Verified vs pending: ${split.join('; ')}`;
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
