import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { CollectionDetailPage } from './collection-detail.page';
import { PaymentDetailsComponent } from './payment-details/payment-details.component';
import { BulkVerifyComponent } from './bulk-verify/bulk-verify.component';
import { CollectionService } from '../../../service/collection.service';
import { PaymentService } from '../../../service/payment.service';
import { Payment } from '../../../models/payment.model';
import { UserStateService } from '../../../service/user-state.service';
import { ClubService } from '../../../service/club.service';
import { Collection } from '../../../models/collection.model';
import { CollectionProgressModule } from '../../../components/collection-progress/collection-progress.module';
import { SharedModule } from '../../../shared/shared.module';

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
  detailsVisible: true,
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
    paymentService = jasmine.createSpyObj('PaymentService', ['getPayments', 'createPayment', 'updateStatus', 'deletePayment', 'extractReceipt', 'checkStatement', 'bulkVerify']);
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
      declarations: [CollectionDetailPage, PaymentDetailsComponent, BulkVerifyComponent],
      imports: [IonicModule.forRoot(), FormsModule, RouterTestingModule, CollectionProgressModule, SharedModule],
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

  it('shows the server verified/awaiting totals in the progress bar', () => {
    fixture.detectChanges();

    expect(text()).toContain('₱4,500 verified');
    expect(text()).toContain('₱1,200 awaiting verification');
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
    expect(text()).toContain('₱4,500 verified');
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

  describe('payment dialog actions (spec 003, US2 + US4)', () => {
    function openAs(p: Payment, admin: boolean) {
      fixture.detectChanges();          // first render loads once; then set state directly
      page.payments = [p];
      page.isAdmin = admin;
      page.openPayment(p);
      collectionService.getCollections.calls.reset();
    }

    it('lets admins review an awaiting payment and delete any payment; payers only read', () => {
      openAs(payment({ status: 'pending' }), true);
      expect(page.canReview).toBeTrue();
      expect(page.canDelete).toBeTrue();

      openAs(payment({ status: 'confirmed' }), true);
      expect(page.canReview).toBeFalse();
      expect(page.canDelete).toBeTrue();

      openAs(payment({ status: 'pending' }), false);
      expect(page.canReview).toBeFalse();
      expect(page.canDelete).toBeFalse();
    });

    for (const [action, status, label] of [
      ['verifyPayment', 'confirmed', 'Verify'],
      ['rejectPayment', 'rejected', 'Reject'],
    ] as const) {
      it(`${label} asks to confirm it is final, then updates the payment and the totals`, async () => {
        openAs(payment({ status: 'pending' }), true);
        paymentService.updateStatus.and.returnValue(of({ payment: payment({ status }) }));

        await page[action]();
        expect(alertButtons.map((b) => b.text)).toEqual(['Cancel', label]);
        expect(paymentService.updateStatus).not.toHaveBeenCalled();
        await pressAlertButton(label);

        expect(paymentService.updateStatus).toHaveBeenCalledOnceWith('p1', status);
        expect(page.selectedPayment?.status).toBe(status);
        expect(page.payments[0].status).toBe(status);
        expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
      });
    }

    it('shows the server message and the real status on a 409', async () => {
      openAs(payment({ status: 'pending' }), true);
      paymentService.updateStatus.and.returnValue(
        throwError(() => new HttpErrorResponse({
          status: 409,
          error: { message: "Payment is already rejected and can't be changed.", status: 'rejected' },
        }))
      );

      await page.verifyPayment();
      await pressAlertButton('Verify');
      await fixture.whenStable();

      expect(page.selectedPayment?.status).toBe('rejected');
      expect(toastController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: "Payment is already rejected and can't be changed." })
      );
      expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
    });

    it('deletes only after confirmation, then closes the dialog and updates the totals', async () => {
      openAs(payment({ status: 'confirmed' }), true);
      paymentService.deletePayment.and.returnValue(of({}));

      await page.deleteSelected();
      expect(alertButtons.map((b) => b.text)).toEqual(['Cancel', 'Delete']);
      expect(paymentService.deletePayment).not.toHaveBeenCalled();
      await pressAlertButton('Delete');

      expect(paymentService.deletePayment).toHaveBeenCalledOnceWith('p1');
      expect(page.payments.length).toBe(0);
      expect(page.showPaymentModal).toBeFalse();
      expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
    });

    it('copies the reference number, or explains how to copy it by hand', async () => {
      openAs(payment({ referenceNumber: 'REF123' }), true);
      const write = jasmine.createSpy('writeText').and.resolveTo();
      spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText: write } as any);

      await page.copyReference();
      expect(write).toHaveBeenCalledWith('REF123');
      expect(toastController.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Reference number copied' }));

      write.and.rejectWith(new Error('denied'));
      await page.copyReference();
      expect(toastController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: "Couldn't copy. Press and hold the number to select it." })
      );
    });

    it('opens the receipt full size in a new tab', () => {
      openAs(payment({ receiptUrl: 'https://res.cloudinary.com/demo/r.jpg' }), true);
      const open = spyOn(window, 'open');

      page.openReceipt();

      expect(open).toHaveBeenCalledWith('https://res.cloudinary.com/demo/r.jpg', '_blank', 'noopener');
    });

    it('closes the dialog when leaving the page', () => {
      openAs(payment(), true);
      page.ionViewWillLeave();
      expect(page.showPaymentModal).toBeFalse();
    });

    it('cards have no delete button and no tappable badge', () => {
      paymentService.getPayments.and.returnValue(of({ payments: [payment(), payment({ _id: 'p2', status: 'confirmed' })] }));
      page.isAdmin = true;
      fixture.detectChanges();

      const list = fixture.nativeElement as HTMLElement;
      expect(list.querySelector('.payment-card ion-button')).toBeNull();
      expect(list.querySelector('.status-badge.clickable')).toBeNull();
    });
  });

  describe('status wording (spec 003, US1)', () => {
    beforeEach(() => {
      paymentService.getPayments.and.returnValue(of({ payments: [
        payment({ _id: 'p1', status: 'confirmed' }),
        payment({ _id: 'p2', status: 'pending' }),
        payment({ _id: 'p3', status: 'rejected' }),
      ] }));
    });

    it('labels payment badges Verified / Awaiting Verification / Rejected', () => {
      fixture.detectChanges();

      const badges = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.status-badge'))
        .map((b) => b.textContent?.trim());
      expect(badges).toEqual(['Verified', 'Awaiting Verification', 'Rejected']);
    });

    it('never shows the old status words on the page', () => {
      for (const admin of [false, true]) {
        page.isAdmin = admin;
        fixture.detectChanges();
        expect(text()).not.toMatch(/confirmed|pending/i);
      }
    });
  });

  describe('payment cards and privacy (spec 003, US5)', () => {
    const cards = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.payment-card'));

    it('cards show only name, amount, date and status, even for admins', () => {
      paymentService.getPayments.and.returnValue(of({ payments: [payment({
        accountName: 'D. PAYER', phoneNumber: '09171234567', referenceNumber: 'REF123',
        receiptUrl: 'https://res.cloudinary.com/demo/r.jpg', description: 'June dues',
        transactionDate: '2026-10-01T08:00:00Z',
      })] }));
      page.isAdmin = true;
      fixture.detectChanges();

      const card = cards()[0];
      const cardText = card.textContent!.replace(/\s+/g, ' ');
      expect(cardText).toContain('Demo Payer');
      expect(cardText).toContain('₱1,200');
      expect(cardText).toContain('Oct 1, 2026');
      expect(cardText).toContain('Awaiting Verification');
      for (const hidden of ['D. PAYER', '0917', 'REF123', 'June dues']) expect(cardText).not.toContain(hidden);
      expect(card.querySelector('img')).toBeNull();
    });

    it('opens the payment dialog only when details are visible', () => {
      paymentService.getPayments.and.returnValue(of({ payments: [
        payment({ _id: 'mine', detailsVisible: true }),
        payment({ _id: 'theirs', detailsVisible: false, referenceNumber: undefined }),
      ] }));
      fixture.detectChanges();

      cards()[1].click();
      expect(page.showPaymentModal).toBeFalse();
      expect(page.selectedPayment).toBeNull();

      cards()[0].click();
      expect(page.showPaymentModal).toBeTrue();
      expect(page.selectedPayment?._id).toBe('mine');
    });

    it('marks only openable cards as buttons', () => {
      paymentService.getPayments.and.returnValue(of({ payments: [
        payment({ _id: 'a', detailsVisible: true }),
        payment({ _id: 'b', detailsVisible: false }),
      ] }));
      fixture.detectChanges();

      expect(cards()[0].classList).toContain('openable');
      expect(cards()[1].classList).not.toContain('openable');
    });
  });

  describe('bulk verify (spec 004)', () => {
    const bulkButton = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ion-button'))
        .find((b) => b.textContent?.includes('Bulk verify'));

    function renderAs(admin: boolean, payments: Payment[]) {
      paymentService.getPayments.and.returnValue(of({ payments }));
      page.isAdmin = admin;
      fixture.detectChanges();
    }

    it('is not offered to non-admins (FR-001)', () => {
      renderAs(false, [payment({ status: 'pending' })]);
      expect(bulkButton()).toBeUndefined();
    });

    it('opens the bulk verify window for admins with awaiting payments', () => {
      renderAs(true, [payment({ status: 'pending' }), payment({ _id: 'p2', status: 'confirmed' })]);

      expect(bulkButton()).toBeDefined();
      expect(bulkButton()!.hasAttribute('disabled') && bulkButton()!.getAttribute('disabled') !== 'false').toBeFalse();
      bulkButton()!.click();
      expect(page.showBulkVerify).toBeTrue();
    });

    it('is disabled with a note when nothing awaits verification', () => {
      renderAs(true, [payment({ status: 'confirmed' }), payment({ _id: 'p2', status: 'rejected' })]);

      expect(page.pendingCount).toBe(0);
      expect(text()).toContain('No payments awaiting verification');
      bulkButton()!.click();
      expect(page.showBulkVerify).toBeFalse();
    });

    it('opens the payment dialog for a tapped result (red-team F1)', () => {
      renderAs(true, [payment({ _id: 'p1' }), payment({ _id: 'p2', name: 'Second' })]);

      page.openPaymentById('p2');

      expect(page.showPaymentModal).toBeTrue();
      expect(page.selectedPayment?.name).toBe('Second');
    });

    it('reloads payments and totals after a bulk verify, success or not (red-team F3)', () => {
      renderAs(true, [payment()]);
      paymentService.getPayments.calls.reset();
      collectionService.getCollections.calls.reset();

      page.refreshAfterBulkVerify();

      expect(paymentService.getPayments).toHaveBeenCalledOnceWith(COLLECTION_ID);
      expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
    });

    it('closes with the page', () => {
      renderAs(true, [payment()]);
      page.openBulkVerify();
      page.ionViewWillLeave();
      expect(page.showBulkVerify).toBeFalse();
    });
  });

  describe('share control (spec 005, FR-001)', () => {
    const shareButton = () =>
      (fixture.nativeElement as HTMLElement).querySelector('ion-button[aria-label="Share collection"]');

    it('appears when a collection is displayed', () => {
      fixture.detectChanges();

      expect(shareButton()).not.toBeNull();
    });

    it('is absent while the collection is loading', () => {
      collectionService.getCollections.and.returnValue(new Observable()); // never emits
      fixture.detectChanges();

      expect(page.collectionLoading).toBeTrue();
      expect(shareButton()).toBeNull();
    });

    it('is absent when the collection fails to load', () => {
      collectionService.getCollections.and.returnValue(throwError(() => new Error('offline')));
      fixture.detectChanges();

      expect(page.collectionError).toBeTrue();
      expect(shareButton()).toBeNull();
    });

    it('is absent on the members-only denied page', () => {
      collectionService.getCollections.and.returnValue(of({ collections: [] }));
      fixture.detectChanges();

      expect(page.accessDenied).toBeTrue();
      expect(shareButton()).toBeNull();
    });
  });

  describe('sharing (spec 005, US1)', () => {
    const expectedUrl = () => `${window.location.origin}/clubs/${CLUB_ID}/collection/${COLLECTION_ID}`;
    let share: jasmine.Spy;

    beforeEach(() => {
      share = jasmine.createSpy('share').and.resolveTo();
      // navigator.share is a data property (not an accessor) in the test browser,
      // so spyOnProperty can't intercept it — define an own property instead (research R6).
      Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: share });
    });

    it('opens the device share sheet with the collection name, the club line and the plain address', async () => {
      fixture.detectChanges();
      await page.shareCollection();

      expect(share).toHaveBeenCalledOnceWith({
        title: 'Demo Fund',
        text: 'A collection by Demo Riders',
        url: expectedUrl(),
      });
    });

    it('shares no amounts', async () => {
      fixture.detectChanges();
      await page.shareCollection();

      const payload = share.calls.mostRecent().args[0] as ShareData;
      expect(`${payload.title} ${payload.text ?? ''}`).not.toMatch(/[₱\d]/);
    });

    it('never shares the /payment variant, even when the page was opened from it', async () => {
      const originalPath = window.location.pathname;
      window.history.replaceState(null, '', '/clubs/club1/collection/col1/payment');
      try {
        fixture = TestBed.createComponent(CollectionDetailPage);
        page = fixture.componentInstance;
        fixture.detectChanges();
        await page.shareCollection();

        const payload = share.calls.mostRecent().args[0] as ShareData;
        expect(payload.url).toBe(expectedUrl());
      } finally {
        window.history.replaceState(null, '', originalPath);
      }
    });
  });

  describe('share fallback (spec 005, US2)', () => {
    const expectedUrl = () => `${window.location.origin}/clubs/${CLUB_ID}/collection/${COLLECTION_ID}`;
    let write: jasmine.Spy;

    const noShareApi = () =>
      Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: undefined });

    beforeEach(() => {
      write = jasmine.createSpy('writeText').and.resolveTo();
      spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText: write } as any);
    });

    it('copies the address and confirms it when there is no share facility', async () => {
      noShareApi();
      fixture.detectChanges();

      await page.shareCollection();

      expect(write).toHaveBeenCalledOnceWith(expectedUrl());
      expect(toastController.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Link copied' }));
    });

    it('shows the address for manual copy when the clipboard is blocked', async () => {
      noShareApi();
      write.and.rejectWith(new Error('denied'));
      fixture.detectChanges();

      await page.shareCollection();

      expect(alertController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: jasmine.stringContaining(expectedUrl()) })
      );
    });

    it('stays silent when the user cancels the share sheet', async () => {
      const share = jasmine.createSpy('share').and.rejectWith(new DOMException('cancel', 'AbortError'));
      Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: share });
      fixture.detectChanges();

      await page.shareCollection();

      expect(write).not.toHaveBeenCalled();
      expect(toastController.create).not.toHaveBeenCalled();
      expect(alertController.create).not.toHaveBeenCalled();
    });

    it('falls back to copying when the share call fails for another reason', async () => {
      const share = jasmine.createSpy('share').and.rejectWith(new DOMException('blocked', 'NotAllowedError'));
      Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: share });
      fixture.detectChanges();

      await page.shareCollection();

      expect(write).toHaveBeenCalledOnceWith(expectedUrl());
      expect(toastController.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Link copied' }));
    });
  });
});
