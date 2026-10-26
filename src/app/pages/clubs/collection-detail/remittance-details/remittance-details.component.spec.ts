import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController, IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Remittance, RemittanceChangeResponse } from '../../../../models/remittance.model';
import { RemittanceService } from '../../../../service/remittance.service';
import { RemittanceDetailsComponent } from './remittance-details.component';

const record = (overrides: Partial<Remittance> = {}): Remittance => ({
  _id: 'r1',
  collection: 'col1',
  club: 'club1',
  amount: 4500,
  remittedOn: '2026-10-24',
  recipientType: 'external',
  recipientName: 'Casa Verde Events',
  note: 'Venue',
  visibility: 'public',
  status: 'active',
  createdAt: '2026-10-24T03:10:00Z',
  detailsVisible: false,
  ...overrides,
});

const adminView = record({
  detailsVisible: true,
  recipientAccount: 'GCash 0917 000 0000',
  proofUrl: 'https://res.cloudinary.com/demo/remittances/p.jpg',
  recordedBy: { _id: 'u1', username: 'admin1' },
});

// Spec 009 Story 2 AC4 / D6: who sees what in a remittance's details.
describe('RemittanceDetailsComponent', () => {
  let fixture: ComponentFixture<RemittanceDetailsComponent>;
  let remittances: jasmine.SpyObj<RemittanceService>;
  let alertController: jasmine.SpyObj<AlertController>;
  let alert: { header?: string; inputs?: any[]; buttons: any[] } | null;
  let voided: RemittanceChangeResponse[];

  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  const proofImage = () => (fixture.nativeElement as HTMLElement).querySelector('img.proof');

  function render(remittance: Remittance) {
    fixture = TestBed.createComponent(RemittanceDetailsComponent);
    fixture.componentInstance.remittance = remittance;
    voided = [];
    fixture.componentInstance.voided.subscribe((r: RemittanceChangeResponse) => voided.push(r));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    remittances = jasmine.createSpyObj('RemittanceService', ['void']);
    alert = null;
    alertController = jasmine.createSpyObj('AlertController', ['create']);
    alertController.create.and.callFake(async (opts: any) => {
      alert = opts;
      return { present: () => Promise.resolve() } as any;
    });
    await TestBed.configureTestingModule({
      declarations: [RemittanceDetailsComponent],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: RemittanceService, useValue: remittances },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();
  });

  it('shows admins the account details, proof photo and who recorded it', () => {
    render(adminView);

    expect(text()).toContain('Casa Verde Events');
    expect(text()).toContain('GCash 0917 000 0000');
    expect(text()).toContain('admin1');
    expect(text()).toContain('Public');
    expect(proofImage()?.getAttribute('src')).toBe(adminView.proofUrl!);
  });

  it('shows everyone else the name, amount, date and note only', () => {
    render(record());

    expect(text()).toContain('Casa Verde Events');
    expect(text()).toContain('4,500');
    expect(text()).toContain('Oct 24, 2026');
    expect(text()).toContain('Venue');
    expect(text()).not.toContain('Recorded by');
    expect(text()).not.toContain('Account');
    expect(proofImage()).toBeNull();
  });

  describe('voiding (Story 4)', () => {
    const voidButton = () => (fixture.nativeElement as HTMLElement).querySelector('ion-button.void-btn') as HTMLElement | null;
    const confirm = (reason: string) => alert!.buttons.find((b: any) => b.text === 'Void')!.handler({ reason });
    const voidedResponse = { remittance: { ...adminView, status: 'voided', voidReason: 'Wrong amount' }, summary: {} } as unknown as RemittanceChangeResponse;

    it('offers Void to admins on active records only', () => {
      render(adminView);
      expect(voidButton()).not.toBeNull();

      render(record());
      expect(voidButton()).toBeNull();

      render({ ...adminView, status: 'voided', voidReason: 'Wrong amount' });
      expect(voidButton()).toBeNull();
    });

    it('asks for a reason and will not void without one (S4 AC3)', async () => {
      render(adminView);

      await fixture.componentInstance.confirmVoid();

      expect(alert!.inputs![0].name).toBe('reason');
      expect(confirm('   ')).toBeFalse();
      expect(remittances.void).not.toHaveBeenCalled();
    });

    it('voids with the reason and reports the result (S4 AC1)', async () => {
      render(adminView);
      remittances.void.and.returnValue(of(voidedResponse));

      await fixture.componentInstance.confirmVoid();
      confirm('  Wrong amount  ');

      expect(remittances.void).toHaveBeenCalledOnceWith('r1', 'Wrong amount');
      expect(voided).toEqual([voidedResponse]);
    });

    it("shows the server's message when it was already voided", async () => {
      render(adminView);
      remittances.void.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'ALREADY_VOIDED', message: 'This remittance is already voided.' } })),
      );

      await fixture.componentInstance.confirmVoid();
      confirm('Wrong amount');
      fixture.detectChanges();

      expect(text()).toContain('This remittance is already voided.');
      expect(voided).toEqual([]);
    });

    it('shows a voided record as Voided, with who, when and why', () => {
      render({
        ...adminView,
        status: 'voided',
        voidReason: 'Wrong amount',
        voidedBy: { _id: 'u2', username: 'admin2' },
        voidedAt: '2026-10-25T01:00:00Z',
      });

      expect(text()).toContain('Voided');
      expect(text()).toContain('Wrong amount');
      expect(text()).toContain('admin2');
    });
  });
});
