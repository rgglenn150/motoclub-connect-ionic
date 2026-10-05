import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';

import {
  CollectionProgressComponent,
  NOTE_DISMISSED_KEY,
  progressBar,
  progressPercents,
  progressSplit,
} from './collection-progress.component';

// Spec 007 research R2. COPY — keep identical to
// motoclub-connect-backend/test/collectionProgress.test.js
// [verified, pending, confirmedPct, pendingPct, confirmedShare, pendingShare]
const SPLIT_CASES: [number, number, number, number, string | null, string | null][] = [
  [4500, 1200, 78.94736842105263, 21.052631578947366, '79%', '21%'],
  [100, 0, 100, 0, '100%', '0%'],
  [0, 0, 0, 0, null, null],
  [0, 1200, 0, 100, '0%', '100%'],
  [1, 2, 33.33333333333333, 66.66666666666667, '33%', '67%'],
  [2, 1, 66.66666666666666, 33.33333333333334, '67%', '33%'],
  [100000, 1, 99.99900000999989, 0.0009999900001063771, '99%', '<1%'],
  [-50, 100, 0, 100, '0%', '100%'],
  [1000.5, 0.5, 99.95004995004995, 0.04995004995005235, '99%', '<1%'],
];

describe('progressSplit (spec 007)', () => {
  for (const [c, p, cPct, pPct, cShare, pShare] of SPLIT_CASES) {
    it(`splits ${c} verified / ${p} pending`, () => {
      const split = progressSplit(c, p);
      expect(split.confirmedPct).toBeCloseTo(cPct, 9);
      expect(split.pendingPct).toBeCloseTo(pPct, 9);
      expect(split.confirmedShare).toBe(cShare);
      expect(split.pendingShare).toBe(pShare);
    });
  }
});

describe('progressBar (spec 007)', () => {
  it('measures toward a positive target exactly as progressPercents does', () => {
    expect(progressBar(4500, 1200, 10000)).toEqual({ mode: 'target', ...progressPercents(4500, 1200, 10000)! });
  });

  it('splits collected money without a positive target', () => {
    for (const target of [undefined, 0, -5]) {
      const bar = progressBar(4500, 1200, target);
      expect(bar.mode).toBe('split');
      expect(bar.mode === 'split' && bar.confirmedShare).toBe('79%');
    }
  });
});

describe('progressPercents', () => {
  it('splits the bar into confirmed and pending shares of the target', () => {
    expect(progressPercents(4500, 1200, 10000)).toEqual({ confirmedPct: 45, pendingPct: 12 });
  });

  it('caps the bar at 100%, confirmed first', () => {
    expect(progressPercents(8000, 5000, 10000)).toEqual({ confirmedPct: 80, pendingPct: 20 });
    expect(progressPercents(12000, 500, 10000)).toEqual({ confirmedPct: 100, pendingPct: 0 });
  });

  it('never draws negative segments', () => {
    expect(progressPercents(-500, -200, 10000)).toEqual({ confirmedPct: 0, pendingPct: 0 });
    expect(progressPercents(1000, -200, 10000)).toEqual({ confirmedPct: 10, pendingPct: 0 });
  });

  it('returns null without a positive target', () => {
    expect(progressPercents(500, 0, undefined)).toBeNull();
    expect(progressPercents(500, 0, 0)).toBeNull();
  });
});

describe('CollectionProgressComponent', () => {
  let fixture: ComponentFixture<CollectionProgressComponent>;
  let component: CollectionProgressComponent;
  let el: HTMLElement;

  function create(inputs: Partial<CollectionProgressComponent> = {}) {
    fixture = TestBed.createComponent(CollectionProgressComponent);
    component = fixture.componentInstance;
    Object.assign(component, { confirmed: 4500, pending: 1200, target: 10000, ...inputs });
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const text = () => el.textContent?.replace(/\s+/g, ' ') ?? '';
  const segment = (kind: string) => el.querySelector<HTMLElement>(`.segment.${kind}`);

  beforeEach(async () => {
    localStorage.removeItem(NOTE_DISMISSED_KEY);
    await TestBed.configureTestingModule({
      declarations: [CollectionProgressComponent],
      imports: [IonicModule.forRoot(), SharedModule],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem(NOTE_DISMISSED_KEY));

  it('shows the bar unchanged, with pending listed before verified (specs 003 + 006)', () => {
    create();

    expect(segment('confirmed')?.style.width).toBe('45%');
    expect(segment('pending')?.style.width).toBe('12%');
    const t = text();
    expect(t).toContain('₱1,200 pending');
    expect(t).toContain('₱4,500 verified');
    expect(t).toContain('₱10,000 target');
    expect(t.indexOf('pending')).toBeLessThan(t.indexOf('verified'));
    expect(t.indexOf('₱1,200')).toBeLessThan(t.indexOf('₱4,500'));
    expect(t.indexOf('₱4,500')).toBeLessThan(t.indexOf('₱10,000'));
  });

  it('exposes the progress to screen readers', () => {
    create();

    const bar = el.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('45');
    expect(bar.getAttribute('aria-label')).toBe('₱1,200 pending, ₱4,500 verified of ₱10,000');
  });

  it('hides the pending segment and label when nothing is pending', () => {
    create({ pending: 0 });

    expect(segment('pending')).toBeNull();
    expect(text()).not.toContain('pending');
    expect(text()).toContain('₱4,500 verified');
  });

  it('shows an empty bar and ₱0 when there are no payments yet', () => {
    create({ confirmed: 0, pending: 0 });

    expect(segment('confirmed')?.style.width).toBe('0%');
    expect(text()).toContain('₱0 verified');
  });

  describe('without a target: verified vs pending split (spec 007)', () => {
    const caption = () => el.querySelector('.split-caption')?.textContent?.trim();
    const bar = () => el.querySelector<HTMLElement>('.progress-bar')!;

    it('splits collected money with a caption and shares (US1 AC1)', () => {
      create({ target: undefined, confirmed: 4500, pending: 1200 });

      expect(caption()).toBe('Verified vs pending');
      expect(parseFloat(segment('confirmed')!.style.width)).toBeCloseTo(78.947, 2);
      expect(parseFloat(segment('pending')!.style.width)).toBeCloseTo(21.053, 2);
      expect(text()).toContain('₱1,200 pending · 21%');
      expect(text()).toContain('₱4,500 verified · 79%');
      expect(text()).not.toContain('target');
    });

    it('is fully verified with no pending segment (AC2)', () => {
      create({ target: undefined, confirmed: 4500, pending: 0 });

      expect(segment('confirmed')!.style.width).toBe('100%');
      expect(segment('pending')).toBeNull();
      expect(text()).toContain('₱4,500 verified · 100%');
    });

    it('shows only pending money as a full lighter bar', () => {
      create({ target: undefined, confirmed: 0, pending: 1200 });

      expect(segment('pending')!.style.width).toBe('100%');
      expect(text()).toContain('₱1,200 pending · 100%');
      expect(text()).toContain('₱0 verified · 0%');
    });

    it('shows an empty bar with the caption when nothing is collected (AC3, FR-002)', () => {
      create({ target: undefined, confirmed: 0, pending: 0 });

      expect(bar()).not.toBeNull();
      expect(caption()).toBe('Verified vs pending');
      expect(segment('pending')).toBeNull();
      expect(segment('confirmed')!.style.width).toBe('0%');
      expect(text()).toContain('₱0 verified');
      expect(text()).not.toContain('%');
    });

    it('keeps a tiny share visible and labels it "<1%" (FR-004)', () => {
      create({ target: undefined, confirmed: 100000, pending: 1 });

      expect(segment('pending')!.classList).toContain('min-visible');
      expect(text()).toContain('₱1 pending · <1%');
      expect(text()).toContain('₱100,000 verified · 99%');
    });

    it('is a labelled picture for screen readers, never a completion percentage (AC6, D4)', () => {
      create({ target: undefined, confirmed: 4500, pending: 1200 });

      expect(bar().getAttribute('role')).toBe('img');
      expect(bar().getAttribute('aria-label')).toBe('Verified vs pending: ₱1,200 pending, 21%; ₱4,500 verified, 79%');
      expect(bar().hasAttribute('aria-valuenow')).toBeFalse();
      expect(el.querySelector('[role="progressbar"]')).toBeNull();
    });

    it('keeps the caption on compact cards (FR-009)', () => {
      create({ target: undefined, compact: true });
      expect(caption()).toBe('Verified vs pending');
    });

    it('leaves target collections unchanged: no caption, no shares (AC4, D6)', () => {
      create();
      expect(caption()).toBeUndefined();
      expect(text()).not.toContain('%');
      expect(bar().getAttribute('role')).toBe('progressbar');
    });
  });

  it('shows a skeleton while loading', () => {
    create({ loading: true });

    expect(el.querySelector('ion-skeleton-text')).not.toBeNull();
    expect(text()).not.toContain('verified');
  });

  it('shows an error with a retry button', () => {
    create({ error: true });
    const retry = spyOn(component.retry, 'emit');

    el.querySelector<HTMLElement>('.progress-error ion-button')!.click();

    expect(text()).not.toContain('verified');
    expect(retry).toHaveBeenCalled();
  });

  it('renders a compact variant for cards', () => {
    create({ compact: true });

    expect(el.querySelector('.collection-progress.compact')).not.toBeNull();
  });

  it('never shows retired status words: confirmed, awaiting (specs 003 + 006)', () => {
    for (const inputs of [{}, { pending: 0 }, { confirmed: 0 }, { target: undefined }, { showNote: true }, { compact: true }]) {
      create(inputs);
      expect(text()).not.toMatch(/confirmed|awaiting/i);
      expect(el.querySelector('[role="progressbar"]')?.getAttribute('aria-label') ?? '').not.toMatch(/confirmed|awaiting/i);
    }
  });

  describe('verified vs pending note', () => {
    const note = () => el.querySelector('.progress-note');

    it('is shown only when asked for', () => {
      create();
      expect(note()).toBeNull();

      create({ showNote: true });
      expect(note()?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        "Verified = checked by an admin. Pending = not reviewed yet. Rejected payments aren't counted."
      );
    });

    it('stays dismissed for this viewer', () => {
      create({ showNote: true });
      el.querySelector<HTMLElement>('.progress-note ion-button')!.click();
      fixture.detectChanges();

      expect(note()).toBeNull();
      expect(localStorage.getItem(NOTE_DISMISSED_KEY)).toBe('1');

      create({ showNote: true });
      expect(note()).toBeNull();
    });

    it('still works when storage is blocked', () => {
      spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
      spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
      create({ showNote: true });

      expect(note()).not.toBeNull();

      el.querySelector<HTMLElement>('.progress-note ion-button')!.click();
      fixture.detectChanges();
      expect(note()).toBeNull();
    });
  });
});
