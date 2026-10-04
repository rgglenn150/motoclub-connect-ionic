import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PaymentDetailsComponent } from './payment-details.component';
import { SharedModule } from '../../../../shared/shared.module';
import { Payment } from '../../../../models/payment.model';

const full = (overrides: Partial<Payment> = {}): Payment => ({
  _id: 'p1',
  collection: 'col1',
  club: 'club1',
  name: 'Demo Payer',
  accountName: 'D. PAYER',
  amount: 1200,
  referenceNumber: 'REF123',
  phoneNumber: '09171234567',
  description: 'June dues',
  transactionDate: '2026-10-01T08:30:00Z',
  receiptUrl: 'https://res.cloudinary.com/demo/image/upload/v1/r.jpg',
  createdBy: { _id: 'u1', username: 'payer' },
  createdAt: '2026-10-01T08:31:00Z',
  status: 'pending',
  detailsVisible: true,
  ...overrides,
});

describe('PaymentDetailsComponent (spec 003, US4)', () => {
  let fixture: ComponentFixture<PaymentDetailsComponent>;
  let component: PaymentDetailsComponent;
  let el: HTMLElement;

  function create(inputs: Partial<PaymentDetailsComponent> = {}) {
    fixture = TestBed.createComponent(PaymentDetailsComponent);
    component = fixture.componentInstance;
    Object.assign(component, { payment: full(), canReview: false, canDelete: false, ...inputs });
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const text = () => el.textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (cls: string) => el.querySelector<HTMLElement>(`ion-button.${cls}`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaymentDetailsComponent],
      imports: [IonicModule.forRoot(), SharedModule],
    }).compileComponents();
  });

  it('shows every detail of the payment', () => {
    create();

    for (const shown of ['Demo Payer', 'D. PAYER', '₱1,200', 'REF123', '09171234567', 'June dues', 'payer', 'Awaiting Verification', 'Oct 1, 2026']) {
      expect(text()).toContain(shown);
    }
  });

  it('says when a payment was submitted without signing in', () => {
    create({ payment: full({ createdBy: null }) });
    expect(text()).toContain('Submitted without signing in');
  });

  it('shows the receipt large and opens it full size when tapped', () => {
    create();
    const opened = spyOn(component.openReceipt, 'emit');

    const img = el.querySelector<HTMLImageElement>('img.receipt')!;
    expect(img.getAttribute('src')).toContain('r.jpg');
    img.click();

    expect(opened).toHaveBeenCalled();
  });

  it('says when there is no receipt', () => {
    create({ payment: full({ receiptUrl: undefined }) });
    expect(el.querySelector('img.receipt')).toBeNull();
    expect(text()).toContain('No receipt attached');
  });

  it('offers a retry when the receipt fails to load', () => {
    create();
    el.querySelector('img.receipt')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(el.querySelector('img.receipt')).toBeNull();
    expect(text()).toContain("Couldn't load the receipt");

    button('receipt-retry')!.click();
    fixture.detectChanges();
    expect(el.querySelector('img.receipt')).not.toBeNull();
    expect(text()).toContain('Demo Payer');
  });

  it('copies the reference number', () => {
    create();
    const copied = spyOn(component.copyRef, 'emit');

    button('copy-ref')!.click();

    expect(copied).toHaveBeenCalled();
  });

  it('offers Verify and Reject only when the payment can be reviewed', () => {
    create({ canReview: true });
    const verify = spyOn(component.verify, 'emit');
    const reject = spyOn(component.reject, 'emit');

    expect(button('verify')!.textContent).toContain('Verify');
    expect(button('reject')!.textContent).toContain('Reject');
    button('verify')!.click();
    button('reject')!.click();
    expect(verify).toHaveBeenCalled();
    expect(reject).toHaveBeenCalled();

    create({ canReview: false });
    expect(button('verify')).toBeNull();
    expect(button('reject')).toBeNull();
  });

  it('offers Delete only when allowed', () => {
    create({ canDelete: true });
    const removed = spyOn(component.remove, 'emit');
    button('delete')!.click();
    expect(removed).toHaveBeenCalled();

    create({ canDelete: false });
    expect(button('delete')).toBeNull();
  });

  it('is read-only for the payer (no actions)', () => {
    create({ canReview: false, canDelete: false });
    for (const cls of ['verify', 'reject', 'delete']) expect(button(cls)).toBeNull();
    expect(button('copy-ref')).not.toBeNull();
  });

  it('never shows the old status words', () => {
    for (const status of ['pending', 'confirmed', 'rejected'] as const) {
      create({ payment: full({ status }), canReview: status === 'pending', canDelete: true });
      expect(text()).not.toMatch(/confirmed|pending/i);
    }
  });

  it('uses tap targets of at least 44px', () => {
    create({ canReview: true, canDelete: true });
    for (const cls of ['verify', 'reject', 'delete', 'copy-ref']) {
      expect(button(cls)!.classList).toContain('tap-target');
    }
  });
});
