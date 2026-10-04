import { ComponentFixture, TestBed } from '@angular/core/testing';
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
  let actionSheetController: jasmine.SpyObj<ActionSheetController>;
  let sheet: { header?: string; buttons: any[] } | null;

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
    actionSheetController = jasmine.createSpyObj('ActionSheetController', ['create']);
    actionSheetController.create.and.callFake(async (opts: any) => {
      sheet = opts;
      return { present: () => Promise.resolve() } as any;
    });

    await TestBed.configureTestingModule({
      declarations: [CollectionDetailPage, PaymentDetailsComponent, BulkVerifyComponent, EditCollectionComponent],
      imports: [IonicModule.forRoot(), FormsModule, RouterTestingModule, CollectionProgressModule, SharedModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ clubId: CLUB_ID, collectionId: COLLECTION_ID }) } } },
        { provide: CollectionService, useValue: collectionService },
        { provide: PaymentService, useValue: paymentService },
        { provide: UserStateService, useValue: {} },
        { provide: ClubService, useValue: jasmine.createSpyObj('ClubService', ['getMembershipStatus']) },
        { provide: AlertController, useValue: alertController },
        { provide: ToastController, useValue: toastController },
        { provide: ActionSheetController, useValue: actionSheetController },
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
    // Ionic moves presented modals to the document, so earlier tests' modals can linger: use the newest.
    const form = () => Array.from(document.querySelectorAll<HTMLElement>('ion-modal.add-payment-modal')).pop()!;
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

    afterEach(() => {
      page.closeAddPaymentModal();
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

    it('unlocks the fields when reading ends (AC2)', () => {
      page.isExtractingReceipt = true;
      fixture.detectChanges();
      page.isExtractingReceipt = false;
      fixture.detectChanges();

      expect(inputs().some((i) => i.disabled)).toBeFalse();
      expect(save().disabled).toBeFalse();
      expect(form().querySelector('.payment-fields')!.classList).not.toContain('frosted');
    });
  });
});
