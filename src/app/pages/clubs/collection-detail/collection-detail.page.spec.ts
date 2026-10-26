import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ActionSheetController, AlertController, IonicModule, ToastController } from '@ionic/angular';
import { Observable, of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { CollectionDetailPage } from './collection-detail.page';
import { PaymentDetailsComponent } from './payment-details/payment-details.component';
import { BulkVerifyComponent } from './bulk-verify/bulk-verify.component';
import { EditCollectionComponent } from './edit-collection/edit-collection.component';
import { RemittancesComponent } from './remittances/remittances.component';
import { RemitDialogComponent } from './remit-dialog/remit-dialog.component';
import { RemittanceDetailsComponent } from './remittance-details/remittance-details.component';
import { RemittanceService } from '../../../service/remittance.service';
import { RemittanceListResponse } from '../../../models/remittance.model';
import { CollectionService } from '../../../service/collection.service';
import { PaymentService } from '../../../service/payment.service';
import { Payment } from '../../../models/payment.model';
import { UserStateService } from '../../../service/user-state.service';
import { ClubService } from '../../../service/club.service';
import { Collection } from '../../../models/collection.model';
import { CollectionProgressModule } from '../../../components/collection-progress/collection-progress.module';
import { SharedModule } from '../../../shared/shared.module';
import { BROWSER_HISTORY, BrowserHistory } from '../../../service/dialog-history.service';
import { ReceiptImageService } from '../../../service/receipt-image.service';
import { RECEIPT_ERROR_MESSAGES } from '../../../models/payment.model';

/** A history stack that fires popstate like a browser, so specs never touch the real one. */
class FakeHistory implements BrowserHistory {
  entries: any[] = [{ page: true }];
  index = 0;
  get state() {
    return this.entries[this.index];
  }
  pushState(state: any) {
    this.entries.splice(this.index + 1);
    this.entries.push(state);
    this.index++;
  }
  back() {
    setTimeout(() => this.go(-1));
  }
  /** What the person's Back press does. */
  go(delta: number) {
    this.index += delta;
    window.dispatchEvent(new PopStateEvent('popstate', { state: this.state }));
  }
}

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

const remittanceList = (overrides: Partial<RemittanceListResponse['summary']> = {}): RemittanceListResponse => ({
  summary: { verifiedTotal: 4500, remittedTotal: 1000, availableToRemit: 3500, hasHidden: false, ...overrides },
  remittances: [],
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
  let actionSheetController: jasmine.SpyObj<ActionSheetController>;
  let sheet: { header?: string; buttons: any[] } | null;
  let history: FakeHistory;
  let receiptImage: jasmine.SpyObj<ReceiptImageService>;
  let remittanceService: jasmine.SpyObj<RemittanceService>;
  let clubService: jasmine.SpyObj<ClubService>;

  /** Runs the handler of the alert button with the given text. */
  async function pressAlertButton(text: string, value?: unknown) {
    const button = alertButtons.find((b) => b.text === text);
    await button.handler(value);
  }

  beforeEach(async () => {
    localStorage.removeItem('token');
    collectionService = jasmine.createSpyObj('CollectionService', ['getCollections', 'deleteCollection', 'updateCollection']);
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
    sheet = null;
    history = new FakeHistory();
    receiptImage = jasmine.createSpyObj('ReceiptImageService', ['prepare']);
    receiptImage.prepare.and.callFake(async (file: File) => file);
    remittanceService = jasmine.createSpyObj('RemittanceService', ['list', 'create', 'void']);
    remittanceService.list.and.returnValue(of(remittanceList()));
    clubService = jasmine.createSpyObj('ClubService', ['getMembershipStatus', 'getClubMembers']);
    clubService.getClubMembers.and.returnValue(of([]));
    actionSheetController = jasmine.createSpyObj('ActionSheetController', ['create']);
    actionSheetController.create.and.callFake(async (opts: any) => {
      sheet = opts;
      return { present: () => Promise.resolve() } as any;
    });

    await TestBed.configureTestingModule({
      declarations: [CollectionDetailPage, PaymentDetailsComponent, BulkVerifyComponent, EditCollectionComponent, RemittancesComponent, RemitDialogComponent, RemittanceDetailsComponent],
      imports: [IonicModule.forRoot(), FormsModule, RouterTestingModule, CollectionProgressModule, SharedModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ clubId: CLUB_ID, collectionId: COLLECTION_ID }) } } },
        { provide: CollectionService, useValue: collectionService },
        { provide: PaymentService, useValue: paymentService },
        { provide: UserStateService, useValue: {} },
        { provide: ClubService, useValue: clubService },
        { provide: RemittanceService, useValue: remittanceService },
        { provide: AlertController, useValue: alertController },
        { provide: ToastController, useValue: toastController },
        { provide: ActionSheetController, useValue: actionSheetController },
        { provide: BROWSER_HISTORY, useValue: history },
        { provide: ReceiptImageService, useValue: receiptImage },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(CollectionDetailPage);
    page = fixture.componentInstance;
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  it('shows the server verified/pending totals in the progress bar', () => {
    fixture.detectChanges();

    expect(text()).toContain('₱4,500 verified');
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

    it('lets admins review a pending payment and delete any payment; payers only read', () => {
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

    it("explains a refused delete with the server's message (spec 009 S5 AC1)", async () => {
      openAs(payment({ status: 'confirmed' }), true);
      paymentService.deletePayment.and.returnValue(
        throwError(() => new HttpErrorResponse({
          status: 409,
          error: { code: 'REMITTED_EXCEEDS_VERIFIED', message: '₱500 of this payment has already been remitted. Void a remittance first.', shortfall: 500 },
        })),
      );

      await page.deleteSelected();
      await pressAlertButton('Delete');
      await fixture.whenStable();

      expect(toastController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: '₱500 of this payment has already been remitted. Void a remittance first.' })
      );
      expect(page.payments.length).toBe(1);
      expect(page.showPaymentModal).toBeTrue();
    });

    it('keeps the generic message when the server gives none', async () => {
      openAs(payment({ status: 'confirmed' }), true);
      paymentService.deletePayment.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

      await page.deleteSelected();
      await pressAlertButton('Delete');
      await fixture.whenStable();

      expect(toastController.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Failed to delete the payment.' }));
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

    it('labels payment badges Verified / Pending / Rejected', () => {
      fixture.detectChanges();

      const badges = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.status-badge'))
        .map((b) => b.textContent?.trim());
      expect(badges).toEqual(['Verified', 'Pending', 'Rejected']);
    });

    it('never shows retired status words on the page (specs 003 + 006)', () => {
      for (const admin of [false, true]) {
        page.isAdmin = admin;
        fixture.detectChanges();
        expect(text()).not.toMatch(/confirmed|awaiting/i);
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
      expect(cardText).toContain('Pending');
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

  describe('bulk verify from the admin menu (specs 004 + 006 US2)', () => {
    const bodyBulkButton = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ion-content ion-button'))
        .find((b) => b.textContent?.includes('Bulk verify'));
    const sheetTexts = () => sheet!.buttons.map((b: any) => b.text);
    const bulkEntry = () => sheet!.buttons.find((b: any) => String(b.text).startsWith('Bulk verify'));

    function renderAs(admin: boolean, payments: Payment[]) {
      paymentService.getPayments.and.returnValue(of({ payments }));
      page.isAdmin = admin;
      fixture.detectChanges();
    }

    it('lists the actions in order, with the pending count (FR-002, red-team F2)', async () => {
      renderAs(true, [payment({ status: 'pending' }), payment({ _id: 'p2', status: 'pending' }), payment({ _id: 'p3', status: 'confirmed' })]);
      await page.openAdminMenu();

      expect(sheetTexts()).toEqual(['Edit collection', 'Bulk verify (2 pending)', 'Delete collection', 'Cancel']);
    });

    it('opens the bulk verify window when payments are pending (US2 AC3)', async () => {
      renderAs(true, [payment({ status: 'pending' })]);
      await page.openAdminMenu();

      await bulkEntry().handler();

      expect(page.showBulkVerify).toBeTrue();
    });

    it('says "No pending payments" and opens nothing when none are pending (US2 AC4)', async () => {
      renderAs(true, [payment({ status: 'confirmed' }), payment({ _id: 'p2', status: 'rejected' })]);
      await page.openAdminMenu();

      expect(bulkEntry().text).toBe('Bulk verify');
      await bulkEntry().handler();

      expect(page.showBulkVerify).toBeFalse();
      expect(toastController.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'No pending payments' }));
    });

    it('has no Bulk verify button or note in the page body (FR-003, US2 AC1)', () => {
      renderAs(true, [payment({ status: 'pending' })]);
      expect(bodyBulkButton()).toBeUndefined();
      expect((fixture.nativeElement as HTMLElement).querySelector('.bulk-verify-section')).toBeNull();

      renderAs(true, [payment({ status: 'confirmed' })]);
      expect(text()).not.toContain('No payments');
    });

    it('is not offered to non-admins (US2 AC5)', async () => {
      renderAs(false, [payment({ status: 'pending' })]);
      await page.openAdminMenu();
      expect(sheet).toBeNull();
      expect(bodyBulkButton()).toBeUndefined();
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

  describe('admin menu and editing (spec 006, US1)', () => {
    const headerButtons = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ion-header ion-button'));
    const manageButton = () => headerButtons().find((b) => b.getAttribute('aria-label') === 'Manage collection');
    const sheetButton = (text: string) => sheet!.buttons.find((b: any) => b.text === text);

    function renderAs(admin: boolean) {
      page.isAdmin = admin;
      fixture.detectChanges();
    }

    it('gives admins a Manage collection button instead of the trash button (FR-001)', () => {
      renderAs(true);
      expect(manageButton()).toBeDefined();
      expect(manageButton()!.querySelector('ion-icon')!.getAttribute('name')).toBe('create-outline');
      expect(headerButtons().some((b) => b.querySelector('ion-icon')?.getAttribute('name') === 'trash-outline')).toBeFalse();
    });

    it('shows members no admin menu (US2 AC5)', () => {
      renderAs(false);
      expect(manageButton()).toBeUndefined();
    });

    it('opens a bottom sheet titled Manage collection (FR-002)', async () => {
      renderAs(true);
      await page.openAdminMenu();

      expect(sheet!.header).toBe('Manage collection');
      expect(sheetButton('Edit collection')).toBeDefined();
      expect(sheetButton('Delete collection').role).toBe('destructive');
      expect(sheetButton('Cancel').role).toBe('cancel');
    });

    it('keeps the delete confirmation (FR-004, US2 AC2)', async () => {
      renderAs(true);
      await page.openAdminMenu();

      await sheetButton('Delete collection').handler();

      expect(alertController.create).toHaveBeenCalledWith(jasmine.objectContaining({ header: 'Delete Collection' }));
      expect(collectionService.deleteCollection).not.toHaveBeenCalled();
    });

    it('opens the edit form from the menu (US1)', async () => {
      renderAs(true);
      await page.openAdminMenu();

      sheetButton('Edit collection').handler();

      expect(page.showEditCollection).toBeTrue();
    });

    it('shows saved changes at once, then refreshes from the server (FR-008)', async () => {
      renderAs(true);
      page.openEditCollection();
      collectionService.getCollections.calls.reset();
      // Hold the refresh so the test sees the values applied before the server answers.
      collectionService.getCollections.and.returnValue(new Subject<{ collections: Collection[] }>());

      await page.onCollectionSaved(collection({ name: 'Renamed', visibility: 'members_only' }));
      fixture.detectChanges();

      expect(page.showEditCollection).toBeFalse();
      expect(page.collection!.name).toBe('Renamed');
      expect(page.collection!.visibility).toBe('members_only');
      expect(collectionService.getCollections).toHaveBeenCalledOnceWith(CLUB_ID);
      expect(toastController.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Collection updated' }));
    });

    it('closes the edit form with the page', () => {
      renderAs(true);
      page.openEditCollection();
      page.ionViewWillLeave();
      expect(page.showEditCollection).toBeFalse();
    });
  });

  describe('Add Payment while a receipt is read (spec 006, US4)', () => {
    // Ionic moves presented modals to the document, so earlier tests' modals can linger: use the newest with content.
    const form = () =>
      Array.from(document.querySelectorAll<HTMLElement>('ion-modal.add-payment-modal'))
        .filter((m) => m.querySelector('.payment-fields'))
        .pop()!;
    const inputs = () => Array.from(form().querySelectorAll('.payment-fields ion-input')) as any[];
    const save = () => form().querySelector('ion-button.save-payment-btn') as any;

    beforeEach(async () => {
      fixture.detectChanges();
      page.openAddPaymentModal();
      page.paymentForm = { ...page.paymentForm, name: 'Demo Payer', amount: 500, referenceNumber: 'R9' };
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    // Wait for the dismissal, so no blank modal outlives the fixture (spec 008 #95).
    afterEach(async () => {
      await page.closeDialogs();
      fixture.detectChanges();
    });

    it('frosts and disables the fields and Save while reading, with a note (AC1)', () => {
      page.isExtractingReceipt = true;
      fixture.detectChanges();

      expect(inputs().length).toBe(7);
      expect(inputs().every((i) => i.disabled)).toBeTrue();
      expect(save().disabled).toBeTrue();
      expect(form().querySelector('.payment-fields')!.classList).toContain('frosted');
      expect(form().textContent).toContain('some fields will fill in automatically');
    });

    it('also makes the fields read-only and covers them with a tap shield (AC1, any browser)', () => {
      page.isExtractingReceipt = true;
      fixture.detectChanges();

      expect(inputs().every((i) => i.readonly)).toBeTrue();
      expect(form().querySelector('.payment-fields .frosted-shield')).not.toBeNull();
    });

    it('drops focus from a field when reading starts (keyboard already open)', () => {
      const field = document.createElement('input');
      document.body.appendChild(field);
      field.focus();
      paymentService.extractReceipt.and.returnValue(new Subject<any>());
      const file = new File(['x'], 'r.png', { type: 'image/png' });

      page.onReceiptSelected({ target: { files: [file] } } as any);

      expect(document.activeElement).not.toBe(field);
      expect(page.isExtractingReceipt).toBeTrue();
      field.remove();
    });

    it('unlocks the fields when reading ends (AC2)', () => {
      page.isExtractingReceipt = true;
      fixture.detectChanges();
      page.isExtractingReceipt = false;
      fixture.detectChanges();

      expect(inputs().some((i) => i.disabled)).toBeFalse();
      expect(inputs().some((i) => i.readonly)).toBeFalse();
      expect(form().querySelector('.payment-fields .frosted-shield')).toBeNull();
      expect(save().disabled).toBeFalse();
      expect(form().querySelector('.payment-fields')!.classList).not.toContain('frosted');
    });
  });

  describe('receipt photos (spec 008, US1 + US3)', () => {
    const photo = (type = 'image/heic', size = 4) => new File([new Uint8Array(size)], 'IMG_0001.heic', { type });
    const prepared = new File([new Uint8Array(8)], 'IMG_0001.jpg', { type: 'image/jpeg' });
    const pick = (file: File) => page.onReceiptSelected({ target: { files: [file] } } as any);
    const toastMessages = () => toastController.create.calls.allArgs().map(([opts]: any[]) => opts.message);

    beforeEach(() => {
      fixture.detectChanges();
      page.openAddPaymentModal();
    });

    it('reads and stores the prepared image, not the original (FR-001, FR-003)', async () => {
      receiptImage.prepare.and.resolveTo(prepared);
      paymentService.extractReceipt.and.returnValue(of({ name: 'Juan', amount: 500, referenceNumber: 'R5', phoneNumber: null, transactionDateTime: null }));
      paymentService.createPayment.and.returnValue(new Subject<any>());

      await pick(photo());

      expect(paymentService.extractReceipt).toHaveBeenCalledOnceWith(prepared);
      expect(page.receiptFile).toBe(prepared);
      expect(page.paymentForm.referenceNumber).toBe('R5');
      expect(page.isExtractingReceipt).toBeFalse();

      page.paymentForm.name = 'Juan';
      page.savePayment();
      const sent = paymentService.createPayment.calls.mostRecent().args[0] as FormData;
      expect(sent.get('receipt')).toEqual(prepared);
    });

    it('keeps the fields frozen while the photo is prepared (US1 AC5)', async () => {
      let finish!: (f: File) => void;
      receiptImage.prepare.and.returnValue(new Promise<File>((r) => (finish = r)));
      paymentService.extractReceipt.and.returnValue(new Subject<any>());

      const done = pick(photo());

      expect(page.isExtractingReceipt).toBeTrue();
      expect(paymentService.extractReceipt).not.toHaveBeenCalled();
      finish(prepared);
      await done;
      expect(paymentService.extractReceipt).toHaveBeenCalled();
      expect(page.isExtractingReceipt).toBeTrue();
    });

    it('only the latest pick fills the form (FR-008)', async () => {
      const first = new Subject<any>();
      const second = new Subject<any>();
      paymentService.extractReceipt.and.returnValues(first, second);

      await pick(photo('image/jpeg'));
      await pick(photo('image/png'));
      first.next({ name: 'Old', amount: 1, referenceNumber: 'OLD', phoneNumber: null, transactionDateTime: null });
      second.next({ name: 'New', amount: 2, referenceNumber: 'NEW', phoneNumber: null, transactionDateTime: null });

      expect(page.paymentForm.referenceNumber).toBe('NEW');
      expect(page.paymentForm.amount).toBe(2);
    });

    it('ignores a late result after Add Payment closed', async () => {
      const result = new Subject<any>();
      paymentService.extractReceipt.and.returnValue(result);
      await pick(photo());

      page.closeAddPaymentModal();
      result.next({ name: 'Late', amount: 9, referenceNumber: 'LATE', phoneNumber: null, transactionDateTime: null });

      expect(page.paymentForm.referenceNumber).not.toBe('LATE');
      expect(page.isExtractingReceipt).toBeFalse();
    });

    it('rejects a file that is not an image without attaching it', async () => {
      await pick(new File(['%PDF'], 'r.pdf', { type: 'application/pdf' }));

      expect(receiptImage.prepare).not.toHaveBeenCalled();
      expect(paymentService.extractReceipt).not.toHaveBeenCalled();
      expect(page.receiptFile).toBeNull();
      expect(page.isExtractingReceipt).toBeFalse();
      expect(toastMessages()).toContain(RECEIPT_ERROR_MESSAGES.UNSUPPORTED_FORMAT);
    });

    it('says "too large" without sending a photo it could not shrink (US3 AC1)', async () => {
      const huge = photo('image/heic', 10 * 1024 * 1024 + 1);
      receiptImage.prepare.and.resolveTo(huge);

      await pick(huge);

      expect(paymentService.extractReceipt).not.toHaveBeenCalled();
      expect(page.receiptFile).toBe(huge);
      expect(page.isExtractingReceipt).toBeFalse();
      expect(toastMessages()).toContain(RECEIPT_ERROR_MESSAGES.FILE_TOO_LARGE);
    });

    for (const code of ['UNSUPPORTED_FORMAT', 'READER_UNAVAILABLE', 'UNREADABLE'] as const) {
      it(`shows the ${code} message and keeps the receipt (US3, D5)`, async () => {
        paymentService.extractReceipt.and.returnValue(
          throwError(() => new HttpErrorResponse({ status: 422, error: { code, message: 'x' } })),
        );
        const file = photo('image/jpeg');

        await pick(file);
        await fixture.whenStable();

        expect(toastMessages()).toContain(RECEIPT_ERROR_MESSAGES[code]);
        expect(page.receiptFile).toBe(file);
        expect(page.isExtractingReceipt).toBeFalse();
      });
    }

    it('says to check the connection when the request never arrives (US3 AC4)', async () => {
      paymentService.extractReceipt.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

      await pick(photo('image/jpeg'));
      await fixture.whenStable();

      expect(toastMessages()).toContain(RECEIPT_ERROR_MESSAGES.NO_CONNECTION);
    });

    it('shows the specific message when saving fails on the receipt (US3 AC7)', async () => {
      paymentService.createPayment.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 413, error: { code: 'FILE_TOO_LARGE', message: RECEIPT_ERROR_MESSAGES.FILE_TOO_LARGE } })),
      );
      page.paymentForm = { ...page.paymentForm, name: 'Demo Payer', amount: 500, referenceNumber: 'R9' };

      page.savePayment();
      await fixture.whenStable();

      expect(toastMessages()).toContain(RECEIPT_ERROR_MESSAGES.FILE_TOO_LARGE);
    });

    it('says to check the connection when saving never arrives (US3 AC4, AC7)', async () => {
      paymentService.createPayment.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      page.paymentForm = { ...page.paymentForm, name: 'Demo Payer', amount: 500, referenceNumber: 'R10' };

      page.savePayment();
      await fixture.whenStable();

      expect(toastMessages()).toContain(RECEIPT_ERROR_MESSAGES.NO_CONNECTION);
    });

    it('keeps the server message for other save errors', async () => {
      paymentService.createPayment.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Reference number already used' } })),
      );
      page.paymentForm = { ...page.paymentForm, name: 'Demo Payer', amount: 500, referenceNumber: 'R11' };

      page.savePayment();
      await fixture.whenStable();

      expect(toastMessages()).toContain('Reference number already used');
    });
  });

  describe('Back closes dialogs (spec 008, US2)', () => {
    const back = async () => {
      history.go(-1);
      await fixture.whenStable();
    };

    beforeEach(() => {
      paymentService.getPayments.and.returnValue(of({ payments: [payment()] }));
      fixture.detectChanges();
      page.isAdmin = true;
    });

    it('closes the payment dialog and stays on the page (AC1)', async () => {
      page.openPayment(payment());
      expect(history.index).toBe(1);

      await back();

      expect(page.showPaymentModal).toBeFalse();
      expect(page.selectedPayment).toBeNull();
      expect(history.index).toBe(0);
    });

    it('closes bulk verify, edit collection and an untouched Add Payment the same way (AC3, AC9)', async () => {
      await page.openBulkVerify();
      await back();
      expect(page.showBulkVerify).toBeFalse();

      page.openEditCollection();
      await back();
      expect(page.showEditCollection).toBeFalse();

      page.openAddPaymentModal();
      await back();
      expect(page.showAddPaymentModal).toBeFalse();
      expect(alertController.create).not.toHaveBeenCalled();
      expect(history.index).toBe(0);
    });

    it('closes only the payment dialog opened over bulk verify (AC4)', async () => {
      await page.openBulkVerify();
      page.openPaymentById('p1');
      expect(history.index).toBe(2);

      await back();

      expect(page.showPaymentModal).toBeFalse();
      expect(page.showBulkVerify).toBeTrue();
    });

    it('a close button removes the entry, so one Back leaves the page (AC6)', fakeAsync(() => {
      page.openPayment(payment());
      page.closePayment();
      tick();

      expect(history.index).toBe(0);
    }));

    it('the /payment link pushes Add Payment like any dialog (AC7)', () => {
      page.loadCollection(true);
      expect(page.showAddPaymentModal).toBeTrue();
      expect(history.index).toBe(1);
    });

    it('asks before discarding a touched Add Payment; Keep editing keeps it (AC8)', async () => {
      page.openAddPaymentModal();
      page.paymentForm.name = 'Half typed';

      await back();

      expect(alertController.create).toHaveBeenCalledWith(jasmine.objectContaining({ header: 'Discard changes?' }));
      expect(page.showAddPaymentModal).toBeTrue();
      expect(page.paymentForm.name).toBe('Half typed');
      expect(history.index).toBe(1);
      expect(alertButtons.find((b) => b.text === 'Keep editing').role).toBe('cancel');
    });

    it('Discard closes the touched Add Payment and removes its entry (AC8)', fakeAsync(() => {
      page.openAddPaymentModal();
      page.receiptFile = new File(['x'], 'r.jpg', { type: 'image/jpeg' });
      history.go(-1);
      tick();

      pressAlertButton('Discard');
      tick();

      expect(page.showAddPaymentModal).toBeFalse();
      expect(history.index).toBe(0);
    }));

    it('asks before discarding a changed Edit Collection (AC8)', async () => {
      page.openEditCollection();
      (page as any).editCollection = { isDirty: true };

      await back();

      expect(alertController.create).toHaveBeenCalledWith(jasmine.objectContaining({ header: 'Discard changes?' }));
      expect(page.showEditCollection).toBeTrue();
    });

    it('closeDialogs closes everything without touching history (AC5, FR-011)', async () => {
      await page.openBulkVerify();
      page.openPaymentById('p1');

      await page.closeDialogs();

      expect(page.showBulkVerify).toBeFalse();
      expect(page.showPaymentModal).toBeFalse();
      expect(history.index).toBe(2);
      history.go(-1); // the leftover entry no longer closes anything
      expect(page.showBulkVerify).toBeFalse();
    });
  });
  describe('remittances (spec 009, US1)', () => {
    // Presented modals are moved to the document: close them so none outlive this test (spec 008 #95).
    afterEach(async () => {
      await page.closeDialogs();
      fixture.detectChanges();
    });

    const remitButton = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('ion-button')).find((b) => b.textContent?.includes('Remit'));

    it('loads the remittance summary with the page', () => {
      fixture.detectChanges();

      expect(remittanceService.list).toHaveBeenCalledWith(COLLECTION_ID);
      expect(page.remittanceSummary?.availableToRemit).toBe(3500);
      expect(text()).toContain('Remittances');
    });

    it('shows Remit to admins only (S1 AC6)', () => {
      fixture.detectChanges();
      expect(remitButton()).toBeUndefined();

      page.isAdmin = true;
      fixture.detectChanges();
      expect(remitButton()).toBeDefined();
    });

    it('does not open the dialog for non-admins', () => {
      fixture.detectChanges();

      page.openRemit();

      expect(page.showRemitDialog).toBeFalse();
    });

    it('Back closes the Remit dialog and stays on the page', async () => {
      fixture.detectChanges();
      page.isAdmin = true;

      page.openRemit();
      expect(page.showRemitDialog).toBeTrue();
      expect(history.index).toBe(1);

      history.go(-1);
      await fixture.whenStable();

      expect(page.showRemitDialog).toBeFalse();
      expect(history.index).toBe(0);
    });

    it('closes and refreshes after a remittance is recorded', () => {
      fixture.detectChanges();
      page.isAdmin = true;
      page.openRemit();
      remittanceService.list.calls.reset();
      remittanceService.list.and.returnValue(of(remittanceList({ remittedTotal: 2000, availableToRemit: 2500 })));

      page.onRemitted({ remittance: {} as any, summary: remittanceList({ remittedTotal: 2000, availableToRemit: 2500 }).summary });

      expect(page.showRemitDialog).toBeFalse();
      expect(remittanceService.list).toHaveBeenCalledOnceWith(COLLECTION_ID);
      expect(page.remittanceSummary?.availableToRemit).toBe(2500);
    });

    it('opens a tapped remittance in its own dialog, which Back closes (S2 AC4)', async () => {
      fixture.detectChanges();
      const record = { ...remittanceList().summary, _id: 'r1' } as any;

      page.openRemittance(record);
      expect(page.showRemittanceModal).toBeTrue();
      expect(page.selectedRemittance).toBe(record);
      expect(history.index).toBe(1);

      history.go(-1);
      await fixture.whenStable();

      expect(page.showRemittanceModal).toBeFalse();
      expect(page.selectedRemittance).toBeNull();
    });

    it('shows the voided record and refreshes the totals after a void (S4)', () => {
      fixture.detectChanges();
      page.openRemittance({ _id: 'r1', status: 'active' } as any);
      remittanceService.list.calls.reset();
      const summary = remittanceList({ remittedTotal: 0, availableToRemit: 4500 }).summary;
      remittanceService.list.and.returnValue(of({ summary, remittances: [] }));

      page.onRemittanceVoided({ remittance: { _id: 'r1', status: 'voided' } as any, summary });

      expect(page.selectedRemittance?.status).toBe('voided');
      expect(page.remittanceSummary).toEqual(summary);
      expect(remittanceService.list).toHaveBeenCalledOnceWith(COLLECTION_ID);
    });

    it('says that deleting the collection also needs its remittances voided (S5 AC4)', async () => {
      fixture.detectChanges();

      await page.deleteCollection();

      expect(alertController.create).toHaveBeenCalledWith(jasmine.objectContaining({
        message: jasmine.stringMatching(/remittances must be voided first/),
      }));
    });

    it('refreshes the summary when payments change, since verified may have moved', () => {
      fixture.detectChanges();
      remittanceService.list.calls.reset();

      page.refreshAfterBulkVerify();

      expect(remittanceService.list).toHaveBeenCalledWith(COLLECTION_ID);
    });

    it('shows an error with retry when remittances fail to load, and the rest of the page still works', () => {
      remittanceService.list.and.returnValue(throwError(() => new Error('offline')));
      fixture.detectChanges();

      expect(page.remittancesError).toBeTrue();
      expect(text()).toContain("Couldn't load remittances");
      expect(text()).toContain('₱4,500 verified');
    });
  });
});
