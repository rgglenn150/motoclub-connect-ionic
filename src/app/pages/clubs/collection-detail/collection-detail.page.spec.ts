import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { CollectionDetailPage } from './collection-detail.page';
import { CollectionService } from '../../../service/collection.service';
import { PaymentService, Payment } from '../../../service/payment.service';
import { UserStateService } from '../../../service/user-state.service';
import { ClubService } from '../../../service/club.service';
import { Collection } from '../../../models/collection.model';
import { CollectionProgressModule } from '../../../components/collection-progress/collection-progress.module';

const CLUB_ID = 'club1';
const COLLECTION_ID = 'col1';

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    _id: COLLECTION_ID,
    club: CLUB_ID,
    clubName: 'Demo Riders',
    name: 'Demo Fund',
    targetAmount: 10000,
    visibility: 'public',
    status: 'open',
    paymentCount: 3,
    confirmedTotal: 4500,
    pendingTotal: 1200,
    totalCollected: 4500,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  _id: 'p1',
  collection: COLLECTION_ID,
  club: CLUB_ID,
  name: 'Demo Payer',
  amount: 1200,
  referenceNumber: 'R1',
  createdBy: null,
  createdAt: '2026-10-01T00:00:00Z',
  status: 'pending',
  ...overrides,
});

describe('CollectionDetailPage', () => {
  let fixture: ComponentFixture<CollectionDetailPage>;
  let page: CollectionDetailPage;
  let collectionService: jasmine.SpyObj<CollectionService>;
  let paymentService: jasmine.SpyObj<PaymentService>;
  let alertController: jasmine.SpyObj<AlertController>;
  let alertButtons: any[];
  let alertInputs: any[];
  let toastController: jasmine.SpyObj<ToastController>;

  /** Runs the handler of the alert button with the given text. */
  async function pressAlertButton(text: string, value?: unknown) {
    const button = alertButtons.find((b) => b.text === text);
    await button.handler(value);
  }

  beforeEach(async () => {
    localStorage.removeItem('token');
    collectionService = jasmine.createSpyObj('CollectionService', ['getCollections', 'deleteCollection']);
    collectionService.getCollections.and.returnValue(of({ collections: [collection()] }));
    paymentService = jasmine.createSpyObj('PaymentService', ['getPayments', 'createPayment', 'updateStatus', 'deletePayment', 'extractReceipt']);
    paymentService.getPayments.and.returnValue(of({ payments: [payment()] }));

    alertController = jasmine.createSpyObj('AlertController', ['create']);
    alertController.create.and.callFake(async (opts: any) => {
      alertButtons = opts.buttons;
      alertInputs = opts.inputs ?? [];
      return { present: () => Promise.resolve() } as any;
    });
    toastController = jasmine.createSpyObj('ToastController', ['create']);
    toastController.create.and.resolveTo({ present: () => Promise.resolve() } as any);

    await TestBed.configureTestingModule({
      declarations: [CollectionDetailPage],
      imports: [IonicModule.forRoot(), FormsModule, RouterTestingModule, CollectionProgressModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ clubId: CLUB_ID, collectionId: COLLECTION_ID }) } } },
        { provide: CollectionService, useValue: collectionService },
        { provide: PaymentService, useValue: paymentService },
        { provide: UserStateService, useValue: {} },
        { provide: ClubService, useValue: jasmine.createSpyObj('ClubService', ['getMembershipStatus']) },
        { provide: AlertController, useValue: alertController },
        { provide: ToastController, useValue: toastController },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(CollectionDetailPage);
    page = fixture.componentInstance;
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  it('shows the server confirmed/pending totals in the progress bar', () => {
    fixture.detectChanges();

    expect(text()).toContain('₱4,500 confirmed');
    expect(text()).toContain('₱1,200 pending');
    expect(text()).toContain('₱10,000 target');
  });

  it('no longer sums payments on the client', () => {
    expect(Object.getOwnPropertyDescriptor(CollectionDetailPage.prototype, 'totalCollected')).toBeUndefined();
  });

  it('shows an error with retry, not "Members Only", when the collection fails to load', () => {
    collectionService.getCollections.and.returnValue(throwError(() => new Error('offline')));
    fixture.detectChanges();

    expect(page.collectionError).toBeTrue();
    expect(page.accessDenied).toBeFalse();
    expect(text()).not.toContain('Members Only');
    expect(text()).toContain("Couldn't load progress.");

    collectionService.getCollections.and.returnValue(of({ collections: [collection()] }));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.progress-error ion-button')!.click();
    fixture.detectChanges();

    expect(page.collectionError).toBeFalse();
    expect(text()).toContain('₱4,500 confirmed');
  });

  it('still shows "Members Only" when the collection is not visible', () => {
    collectionService.getCollections.and.returnValue(of({ collections: [] }));
    fixture.detectChanges();

    expect(page.accessDenied).toBeTrue();
    expect(page.collectionError).toBeFalse();
    expect(text()).toContain('Members Only');
  });

  it('re-fetches the collection after a payment is added', () => {
    fixture.detectChanges();
    paymentService.createPayment.and.returnValue(of({ payment: payment({ _id: 'p2' }) }));
    page.paymentForm = { ...page.paymentForm, name: 'Demo Payer', amount: 500, referenceNumber: 'R9' };
    collectionService.getCollections.calls.reset();

    page.savePayment();

    expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
  });

  it('re-fetches the collection after a payment is deleted', async () => {
    fixture.detectChanges();
    paymentService.deletePayment.and.returnValue(of({}));
    collectionService.getCollections.calls.reset();

    await page.deletePayment(page.payments[0]);
    await pressAlertButton('Delete');

    expect(page.payments.length).toBe(0);
    expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
  });

  it('re-fetches the collection after a payment status changes', async () => {
    fixture.detectChanges();
    paymentService.updateStatus.and.returnValue(of({ payment: payment({ status: 'confirmed' }) }));
    collectionService.getCollections.calls.reset();

    await page.changeStatus(page.payments[0]);
    await pressAlertButton(alertButtons[alertButtons.length - 1].text, 'confirmed');

    expect(page.payments[0].status).toBe('confirmed');
    expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
    expect(alertInputs.length).toBeGreaterThan(0);
  });

  describe('payment status (Story 5)', () => {
    it('offers only Confirm and Reject for a pending payment', async () => {
      fixture.detectChanges();

      await page.changeStatus(page.payments[0]);

      expect(alertInputs.map((i) => i.value)).toEqual(['confirmed', 'rejected']);
    });

    it('offers no status change for a resolved payment', async () => {
      paymentService.getPayments.and.returnValue(of({ payments: [payment({ status: 'confirmed' })] }));
      fixture.detectChanges();
      alertController.create.calls.reset();

      await page.changeStatus(page.payments[0]);

      expect(alertController.create).not.toHaveBeenCalled();
    });

    it('makes only pending badges tappable for admins', () => {
      paymentService.getPayments.and.returnValue(
        of({ payments: [payment({ _id: 'p1' }), payment({ _id: 'p2', status: 'rejected' })] })
      );
      page.isAdmin = true;
      fixture.detectChanges();

      const badges = (fixture.nativeElement as HTMLElement).querySelectorAll('.status-badge');
      expect(badges[0].classList).toContain('clickable');
      expect(badges[1].classList).not.toContain('clickable');
    });

    it('shows the server message and the real status on a 409', async () => {
      fixture.detectChanges();
      paymentService.updateStatus.and.returnValue(
        throwError(() => new HttpErrorResponse({
          status: 409,
          error: { message: "Payment is already rejected and can't be changed.", status: 'rejected' },
        }))
      );
      collectionService.getCollections.calls.reset();

      await page.changeStatus(page.payments[0]);
      await pressAlertButton(alertButtons[alertButtons.length - 1].text, 'confirmed');
      await fixture.whenStable();

      expect(page.payments[0].status).toBe('rejected');
      expect(toastController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: "Payment is already rejected and can't be changed." })
      );
      expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
    });
  });
});
