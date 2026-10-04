import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';

import {
  CollectionProgressComponent,
  NOTE_DISMISSED_KEY,
  progressPercents,
} from './collection-progress.component';

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

  it('shows the bar unchanged, with awaiting listed before verified (spec 003)', () => {
    create();

    expect(segment('confirmed')?.style.width).toBe('45%');
    expect(segment('pending')?.style.width).toBe('12%');
    const t = text();
    expect(t).toContain('₱1,200 awaiting verification');
    expect(t).toContain('₱4,500 verified');
    expect(t).toContain('₱10,000 target');
    expect(t.indexOf('awaiting verification')).toBeLessThan(t.indexOf('verified', t.indexOf('awaiting verification') + 22));
    expect(t.indexOf('₱1,200')).toBeLessThan(t.indexOf('₱4,500'));
    expect(t.indexOf('₱4,500')).toBeLessThan(t.indexOf('₱10,000'));
  });

  it('exposes the progress to screen readers', () => {
    create();

    const bar = el.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('45');
    expect(bar.getAttribute('aria-label')).toBe('₱1,200 awaiting verification, ₱4,500 verified of ₱10,000');
  });

  it('hides the awaiting segment and label when nothing is awaiting', () => {
    create({ pending: 0 });

    expect(segment('pending')).toBeNull();
    expect(text()).not.toContain('awaiting');
    expect(text()).toContain('₱4,500 verified');
  });

  it('shows an empty bar and ₱0 when there are no payments yet', () => {
    create({ confirmed: 0, pending: 0 });

    expect(segment('confirmed')?.style.width).toBe('0%');
    expect(text()).toContain('₱0 verified');
  });

  it('shows amounts without a bar when there is no target', () => {
    create({ target: undefined, confirmed: 500, pending: 250 });

    expect(el.querySelector('[role="progressbar"]')).toBeNull();
    expect(text()).toContain('₱250 awaiting verification');
    expect(text()).toContain('₱500 verified');
    expect(text()).not.toContain('target');
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

  it('never shows the old status words (spec 003 SC-001)', () => {
    for (const inputs of [{}, { pending: 0 }, { confirmed: 0 }, { target: undefined }, { showNote: true }, { compact: true }]) {
      create(inputs);
      expect(text()).not.toMatch(/confirmed|pending/i);
      expect(el.querySelector('[role="progressbar"]')?.getAttribute('aria-label') ?? '').not.toMatch(/confirmed|pending/i);
    }
  });

  describe('verified vs awaiting note', () => {
    const note = () => el.querySelector('.progress-note');

    it('is shown only when asked for', () => {
      create();
      expect(note()).toBeNull();

      create({ showNote: true });
      expect(note()?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        "Verified = checked by an admin. Awaiting verification = not reviewed yet. Rejected payments aren't counted."
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
