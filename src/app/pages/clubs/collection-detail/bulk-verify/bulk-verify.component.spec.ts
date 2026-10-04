import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { IonicModule, ToastController } from '@ionic/angular';
import { of, Subject, throwError } from 'rxjs';

import { BulkVerifyComponent } from './bulk-verify.component';
import { PaymentService } from '../../../../service/payment.service';
import { BulkVerifyResponse, StatementCheckResponse, StatementMatchResult } from '../../../../models/statement-check.model';

const pdfFile = (encrypted: boolean, name = 'statement.pdf') =>
  new File([`%PDF-1.6\ntrailer << /Root 1 0 R${encrypted ? ' /Encrypt 8 0 R' : ''} >>\n%%EOF`], name, {
    type: 'application/pdf',
  });

const result = (overrides: Partial<StatementMatchResult>): StatementMatchResult => ({
  paymentId: 'p',
  name: 'Payer',
  amount: 500,
  referenceNumber: '9000000000001',
  transactionDate: '2026-10-01T10:00:00.000Z',
  outcome: 'matched',
  reasons: [],
  notes: [],
  statementEntry: { dateTime: '2026-10-01T10:00:00+08:00', amount: 500, direction: 'received' },
  ...overrides,
});

const RESPONSE: StatementCheckResponse = {
  statement: { from: '2026-09-27', to: '2026-10-03', entryCount: 11 },
  summary: { checked: 7, matched: 3, mismatched: 3, notFound: 1, matchedTotal: 1800 },
  results: [
    result({ paymentId: 'a', name: 'Payer A' }),
    result({ paymentId: 'b', name: 'Payer B', amount: 1000, notes: [{ code: 'NO_DATE' }] }),
    result({
      paymentId: 'd',
      name: 'Payer D',
      amount: 300,
      notes: [{ code: 'DATE_DIFFERS', app: '2026-10-02', statement: '2026-10-01' }],
    }),
    result({
      paymentId: 'c',
      name: 'Payer C',
      amount: 50,
      outcome: 'mismatch',
      reasons: [{ code: 'AMOUNT_DIFFERS', app: 50, statement: 500 }],
    }),
    result({ paymentId: 'e', name: 'Payer E', outcome: 'mismatch', reasons: [{ code: 'NOT_RECEIVED' }] }),
    result({
      paymentId: 'g',
      name: 'Payer G',
      outcome: 'mismatch',
      reasons: [{ code: 'DUPLICATE_IN_STATEMENT' }],
      statementEntry: null,
    }),
    result({ paymentId: 'f', name: 'Payer F', outcome: 'not_found', statementEntry: null }),
  ],
};

const apiError = (status: number, code?: string, message?: string) =>
  new HttpErrorResponse({ status, error: code ? { code, message } : null });

describe('BulkVerifyComponent (spec 004)', () => {
  let fixture: ComponentFixture<BulkVerifyComponent>;
  let component: BulkVerifyComponent;
  let paymentService: jasmine.SpyObj<PaymentService>;
  let toastController: jasmine.SpyObj<ToastController>;

  beforeEach(async () => {
    paymentService = jasmine.createSpyObj('PaymentService', ['checkStatement', 'bulkVerify']);
    paymentService.checkStatement.and.returnValue(of(RESPONSE));
    toastController = jasmine.createSpyObj('ToastController', ['create']);
    toastController.create.and.resolveTo({ present: () => Promise.resolve() } as any);

    await TestBed.configureTestingModule({
      declarations: [BulkVerifyComponent],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        { provide: PaymentService, useValue: paymentService },
        { provide: ToastController, useValue: toastController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkVerifyComponent);
    component = fixture.componentInstance;
    component.collectionId = 'col1';
    fixture.detectChanges();
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  async function pick(file: File) {
    await component.selectFile(file);
    fixture.detectChanges();
  }

  describe('choosing a file (US1, FR-013)', () => {
    it('refuses a non-PDF before uploading', async () => {
      await pick(new File(['hello'], 'notes.txt', { type: 'text/plain' }));

      expect(component.state).toBe('pick');
      expect(text()).toContain('Please choose a PDF file.');
      expect(paymentService.checkStatement).not.toHaveBeenCalled();
    });

    it('refuses a file over 10 MB before uploading', async () => {
      await pick(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' }));

      expect(text()).toContain('This file is larger than 10 MB.');
      expect(paymentService.checkStatement).not.toHaveBeenCalled();
    });

    it('asks for the password only for a protected PDF (AC5)', async () => {
      const file = pdfFile(true);
      await pick(file);

      expect(component.state).toBe('password');
      expect(paymentService.checkStatement).not.toHaveBeenCalled();

      component.password = 'secret';
      component.submitPassword();

      expect(paymentService.checkStatement).toHaveBeenCalledOnceWith('col1', file, 'secret');
    });

    it('checks an unprotected PDF straight away, without a password (AC6)', async () => {
      const file = pdfFile(false);
      await pick(file);

      expect(paymentService.checkStatement).toHaveBeenCalledOnceWith('col1', file, undefined);
      expect(component.state).toBe('results');
    });
  });

  describe('errors (FR-008)', () => {
    it('asks for a password when the server says one is required', async () => {
      paymentService.checkStatement.and.returnValue(
        throwError(() => apiError(422, 'PASSWORD_REQUIRED', 'This PDF is password-protected. Enter its password.'))
      );
      await pick(pdfFile(false));

      expect(component.state).toBe('password');
    });

    it('keeps the file after a wrong password so the admin can retry (AC7)', async () => {
      const file = pdfFile(true);
      await pick(file);
      paymentService.checkStatement.and.returnValue(
        throwError(() => apiError(422, 'PASSWORD_INCORRECT', 'Incorrect PDF password.'))
      );
      component.password = 'wrong';
      component.submitPassword();
      fixture.detectChanges();

      expect(component.state).toBe('password');
      expect(text()).toContain('Incorrect PDF password.');

      paymentService.checkStatement.and.returnValue(of(RESPONSE));
      component.password = 'right';
      component.submitPassword();

      expect(paymentService.checkStatement.calls.mostRecent().args).toEqual(['col1', file, 'right']);
      expect(component.state).toBe('results');
    });

    it("shows the server's message with a retry for unreadable statements", async () => {
      paymentService.checkStatement.and.returnValue(
        throwError(() => apiError(422, 'NO_TRANSACTIONS', "We couldn't find GCash transactions in this file."))
      );
      await pick(pdfFile(false));

      expect(component.state).toBe('error');
      expect(text()).toContain("We couldn't find GCash transactions in this file.");

      paymentService.checkStatement.and.returnValue(of(RESPONSE));
      component.retry();
      expect(paymentService.checkStatement).toHaveBeenCalledTimes(2);
      expect(component.state).toBe('results');
    });

    it('explains a network failure', async () => {
      paymentService.checkStatement.and.returnValue(throwError(() => apiError(0)));
      await pick(pdfFile(false));

      expect(component.state).toBe('error');
      expect(text()).toContain("Couldn't reach the server. Check your connection and try again.");
    });
  });

  it('shows a loading state and ignores a second submit while checking', async () => {
    const pending = new Subject<StatementCheckResponse>();
    paymentService.checkStatement.and.returnValue(pending);
    await pick(pdfFile(true));
    component.password = 'secret';
    component.submitPassword();
    component.submitPassword();
    fixture.detectChanges();

    expect(component.state).toBe('checking');
    expect(text()).toContain('Reading statement');
    expect(paymentService.checkStatement).toHaveBeenCalledTimes(1);
  });

  describe('results (US1 AC1–4, FR-007)', () => {
    beforeEach(async () => {
      await pick(pdfFile(false));
    });

    it('groups payments as matched, mismatch and not found', () => {
      expect(component.matched.map((r) => r.paymentId)).toEqual(['a', 'b', 'd']);
      expect(component.mismatched.map((r) => r.paymentId)).toEqual(['c', 'e', 'g']);
      expect(component.notFound.map((r) => r.paymentId)).toEqual(['f']);
    });

    it('explains each reason and note in words', () => {
      expect(text()).toContain('Amount differs: ₱50 in app, ₱500 in statement');
      expect(text()).toContain('Not a received payment');
      expect(text()).toContain('Appears more than once in the statement');
      expect(text()).toContain('Date differs: Oct 2 in app, Oct 1 in statement');
      expect(text()).toContain('No date on payment');
      expect(component.reasonText({ code: 'DUPLICATE_REFERENCE' })).toBe('Duplicate reference in this collection');
    });

    it('summarizes counts, the matched total and the statement period', () => {
      expect(text()).toContain('7 checked');
      expect(text()).toContain('3 matched');
      expect(text()).toContain('3 mismatch');
      expect(text()).toContain('1 not found');
      expect(text()).toContain('₱1,800');
      expect(text()).toContain('Sep 27 – Oct 3, 2026');
    });

    it('opens a payment when its result is tapped (red-team F1)', () => {
      const opened: string[] = [];
      component.openPayment.subscribe((id: string) => opened.push(id));

      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-payment-id="c"] .result-main')!.click();

      expect(opened).toEqual(['c']);
    });
  });

  it('says so when there is nothing awaiting verification', async () => {
    paymentService.checkStatement.and.returnValue(
      of({ ...RESPONSE, summary: { checked: 0, matched: 0, mismatched: 0, notFound: 0, matchedTotal: 0 }, results: [] })
    );
    await pick(pdfFile(false));

    expect(text()).toContain('No payments awaiting verification.');
  });

  describe('verify selected (US2)', () => {
    let changed: number;
    let done: number;
    const verifyButton = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ion-button')).find((b) =>
        b.textContent?.includes('Verify selected')
      );
    const verifiedPayment = (id: string) => ({ _id: id, status: 'confirmed' }) as any;

    beforeEach(async () => {
      changed = 0;
      done = 0;
      component.changed.subscribe(() => changed++);
      component.done.subscribe(() => done++);
      await pick(pdfFile(false));
    });

    it('offers checkboxes only on matches, all pre-selected (AC1)', () => {
      const boxes = (fixture.nativeElement as HTMLElement).querySelectorAll('ion-checkbox');
      expect(boxes.length).toBe(3);
      expect(component.selectedCount).toBe(3);
      expect(verifyButton()!.textContent).toContain('Verify selected (3)');
    });

    it('verifies exactly the selected payments, then reloads and closes (AC2)', async () => {
      paymentService.bulkVerify.and.returnValue(
        of<BulkVerifyResponse>({ verified: [verifiedPayment('a'), verifiedPayment('d')], skipped: [] })
      );
      component.toggle('b', false);
      fixture.detectChanges();
      expect(verifyButton()!.textContent).toContain('Verify selected (2)');

      await component.verifySelected();

      expect(paymentService.bulkVerify).toHaveBeenCalledOnceWith('col1', ['a', 'd']);
      expect(toastController.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: '2 payments verified' }));
      expect(changed).toBe(1);
      expect(done).toBe(1);
    });

    it('reports payments another admin already reviewed (AC3)', async () => {
      paymentService.bulkVerify.and.returnValue(
        of<BulkVerifyResponse>({
          verified: [verifiedPayment('a')],
          skipped: [
            { paymentId: 'b', reason: 'ALREADY_REVIEWED', status: 'confirmed' },
            { paymentId: 'd', reason: 'NOT_FOUND' },
          ],
        })
      );

      await component.verifySelected();

      expect(toastController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: '1 payment verified · 1 already reviewed · 1 not found' })
      );
    });

    it('selects or clears every match from the Matched heading (AC5, FR-016)', () => {
      const toggleAll = () =>
        (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.matched .select-all')!;

      // All pre-selected → offers Clear all.
      expect(toggleAll().textContent).toContain('Clear all');
      toggleAll().click();
      fixture.detectChanges();
      expect(component.selectedCount).toBe(0);
      expect(toggleAll().textContent).toContain('Select all');

      // Partly selected → Select all ticks every match.
      component.toggle('b', true);
      fixture.detectChanges();
      expect(toggleAll().textContent).toContain('Select all');
      toggleAll().click();
      fixture.detectChanges();
      expect(component.selectedCount).toBe(3);
      expect(verifyButton()!.textContent).toContain('Verify selected (3)');
      expect(toggleAll().textContent).toContain('Clear all');
    });

    it('is disabled with nothing selected (AC4)', async () => {
      for (const id of ['a', 'b', 'd']) component.toggle(id, false);
      fixture.detectChanges();

      expect(component.selectedCount).toBe(0);
      await component.verifySelected();
      expect(paymentService.bulkVerify).not.toHaveBeenCalled();
    });

    it('reloads after a failure too, and stays open for a retry (red-team F3)', async () => {
      paymentService.bulkVerify.and.returnValue(throwError(() => apiError(0)));

      await component.verifySelected();

      expect(changed).toBe(1);
      expect(done).toBe(0);
      expect(component.state).toBe('results');
      expect(toastController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: "Couldn't reach the server. Check your connection and try again." })
      );
    });
  });
});
