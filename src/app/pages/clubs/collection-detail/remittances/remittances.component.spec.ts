import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Remittance, RemittanceSummary } from '../../../../models/remittance.model';
import { RemittancesComponent } from './remittances.component';

export const remittance = (overrides: Partial<Remittance> = {}): Remittance => ({
  _id: 'r1',
  collection: 'col1',
  club: 'club1',
  amount: 10000,
  remittedOn: '2026-10-24',
  recipientType: 'member',
  recipientName: 'juan',
  note: 'Venue deposit',
  visibility: 'members',
  status: 'active',
  createdAt: '2026-10-24T03:10:00Z',
  detailsVisible: false,
  ...overrides,
});

const summary = (overrides: Partial<RemittanceSummary> = {}): RemittanceSummary => ({
  verifiedTotal: 12000,
  remittedTotal: 10000,
  availableToRemit: 2000,
  hasHidden: false,
  ...overrides,
});

// Spec 009 Story 1 / Story 3: the summary strip and list, with loading, empty
// and error states (FR-008, FR-012).
describe('RemittancesComponent', () => {
  let fixture: ComponentFixture<RemittancesComponent>;
  let component: RemittancesComponent;

  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  const query = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector);

  function render(inputs: Partial<RemittancesComponent>) {
    Object.assign(component, inputs);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RemittancesComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(RemittancesComponent);
    component = fixture.componentInstance;
  });

  it('shows the summary exactly as the API sent it, without recomputing', () => {
    // Deliberately inconsistent: the app must not do its own arithmetic (R2).
    render({ summary: summary({ verifiedTotal: 100, remittedTotal: 30, availableToRemit: 999 }), remittances: [] });

    expect(query('.remit-verified')?.textContent).toContain('100');
    expect(query('.remit-remitted')?.textContent).toContain('30');
    expect(query('.remit-available')?.textContent).toContain('999');
  });

  it('lists each remittance with date, recipient, amount and note', () => {
    render({ summary: summary(), remittances: [remittance()] });

    expect(text()).toContain('juan');
    expect(text()).toContain('10,000');
    expect(text()).toContain('Venue deposit');
    expect(text()).toContain('Oct 24, 2026');
  });

  it('asks the page to open a remittance when it is tapped', () => {
    const opened: Remittance[] = [];
    component.open.subscribe((r: Remittance) => opened.push(r));
    const record = remittance();
    render({ summary: summary(), remittances: [record] });

    (query('.remittance-card') as HTMLElement).click();

    expect(opened).toEqual([record]);
  });

  it('notes when some remittances are hidden from this viewer (D7, S3 AC3)', () => {
    render({ summary: summary({ hasHidden: true }), remittances: [remittance()] });
    expect(text()).toContain('Some remittances are visible to admins only.');

    render({ summary: summary({ hasHidden: false }) });
    expect(text()).not.toContain('visible to admins only');
  });

  it("labels each record's visibility for admins only", () => {
    render({
      summary: summary(),
      remittances: [
        remittance({ _id: 'a', visibility: 'admins', detailsVisible: true }),
        remittance({ _id: 'b', visibility: 'public', detailsVisible: true }),
      ],
    });
    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.visibility-label')).map((l) => l.textContent?.trim());
    expect(labels).toEqual(['Admins only', 'Public']);

    render({ remittances: [remittance({ visibility: 'members', detailsVisible: false })] });
    expect(query('.visibility-label')).toBeNull();
  });

  it('shows an empty state when there are no remittances (S3 AC4)', () => {
    render({ summary: summary({ remittedTotal: 0 }), remittances: [] });

    expect(text()).toContain('No remittances yet');
  });

  it('shows a skeleton while loading', () => {
    render({ loading: true, summary: null, remittances: [] });

    expect(query('.remittances-skeleton')).not.toBeNull();
    expect(text()).not.toContain('No remittances yet');
  });

  it('shows an error with Retry, which asks the page to reload (S3 AC6)', () => {
    let retried = 0;
    component.retry.subscribe(() => retried++);
    render({ error: true, summary: null, remittances: [] });

    expect(text()).toContain("Couldn't load remittances");
    (query('.remittances-retry') as HTMLElement).click();
    expect(retried).toBe(1);
  });
});
