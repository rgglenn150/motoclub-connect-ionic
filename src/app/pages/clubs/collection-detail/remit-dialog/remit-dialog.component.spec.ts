import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { RemitDialogComponent, localToday } from './remit-dialog.component';
import { RemittanceService } from '../../../../service/remittance.service';
import { ClubService } from '../../../../service/club.service';
import { ClubMember } from '../../../../models/club.model';
import { RemittanceChangeResponse } from '../../../../models/remittance.model';
import { ReceiptImageService } from '../../../../service/receipt-image.service';
import { RECEIPT_ERROR_MESSAGES } from '../../../../models/payment.model';

const member = (id: string, name: string): ClubMember => ({
  _id: id,
  user: { _id: `u-${id}`, name, email: `${id}@x.test` },
  club: 'club1',
  role: 'member',
  joinedAt: '2026-01-01T00:00:00Z',
});

const savedResponse = { remittance: { _id: 'r1' }, summary: {} } as unknown as RemittanceChangeResponse;

// Spec 009 Story 1: the admin Remit dialog (FR-001, FR-005, FR-013).
describe('RemitDialogComponent', () => {
  let fixture: ComponentFixture<RemitDialogComponent>;
  let component: RemitDialogComponent;
  let remittances: jasmine.SpyObj<RemittanceService>;
  let clubs: jasmine.SpyObj<ClubService>;
  let receiptImage: jasmine.SpyObj<ReceiptImageService>;
  let saved: RemittanceChangeResponse[];

  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  function create(available = 2000) {
    fixture = TestBed.createComponent(RemitDialogComponent);
    component = fixture.componentInstance;
    component.collectionId = 'col1';
    component.clubId = 'club1';
    component.availableToRemit = available;
    saved = [];
    component.saved.subscribe((r: RemittanceChangeResponse) => saved.push(r));
    fixture.detectChanges();
  }

  function fill(fields: Partial<RemitDialogComponent['form']>) {
    Object.assign(component.form, fields);
    component.validate();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    remittances = jasmine.createSpyObj('RemittanceService', ['create']);
    clubs = jasmine.createSpyObj('ClubService', ['getClubMembers']);
    clubs.getClubMembers.and.returnValue(of([member('m2', 'Pedro'), member('m1', 'Ana')]));
    receiptImage = jasmine.createSpyObj('ReceiptImageService', ['prepare']);

    await TestBed.configureTestingModule({
      declarations: [RemitDialogComponent],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        { provide: RemittanceService, useValue: remittances },
        { provide: ClubService, useValue: clubs },
        { provide: ReceiptImageService, useValue: receiptImage },
      ],
    }).compileComponents();
  });

  it("offers this club's members, by name", () => {
    create();

    expect(clubs.getClubMembers).toHaveBeenCalledWith('club1');
    expect(component.members.map((m) => m.user.name)).toEqual(['Ana', 'Pedro']);
  });

  it('defaults the date to today and refuses a future date', () => {
    create();
    expect(component.form.remittedOn).toBe(localToday());

    fill({ amount: '100', memberId: 'm1', remittedOn: '2999-01-01' });

    expect(component.errors.remittedOn).toBe("The date can't be in the future.");
    expect(component.canSave).toBeFalse();
  });

  it('stops an amount above what is available, inline (S1 AC2)', () => {
    create(2000);

    fill({ amount: '3000', memberId: 'm1' });

    expect(text()).toContain('Only ₱2,000 available to remit');
    expect(component.canSave).toBeFalse();
  });

  it('allows exactly the available amount', () => {
    create(2000);

    fill({ amount: '2000', memberId: 'm1' });

    expect(component.errors.amount).toBeUndefined();
    expect(component.canSave).toBeTrue();
  });

  it('cannot be submitted when nothing is available (S1 AC5)', () => {
    create(0);

    fill({ amount: '1', memberId: 'm1' });

    expect(text()).toContain('Nothing is available to remit yet.');
    expect(component.canSave).toBeFalse();
  });

  it('requires a member to be picked', () => {
    create();

    fill({ amount: '100', memberId: '' });

    expect(component.canSave).toBeFalse();
  });

  it('sends the remittance with Members visibility by default and reports it saved', () => {
    create();
    remittances.create.and.returnValue(of(savedResponse));
    fill({ amount: '1500.50', memberId: 'm1', note: '  Venue deposit  ' });

    component.save();

    expect(remittances.create).toHaveBeenCalledWith(
      {
        collection: 'col1',
        amount: 1500.5,
        recipientType: 'member',
        memberId: 'm1',
        note: 'Venue deposit',
        visibility: 'members',
        remittedOn: localToday(),
      },
      null,
    );
    expect(saved).toEqual([savedResponse]);
  });

  it("shows the server's message when the amount is no longer available (S1 AC4)", () => {
    create(2000);
    remittances.create.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 409,
        error: { code: 'EXCEEDS_AVAILABLE', message: 'Only ₱500 is available to remit.', availableToRemit: 500 },
      })),
    );
    fill({ amount: '1500', memberId: 'm1' });

    component.save();
    fixture.detectChanges();

    expect(text()).toContain('Only ₱500 is available to remit.');
    expect(component.availableToRemit).toBe(500);
    expect(saved).toEqual([]);
  });

  it('marks the fields the server rejected', () => {
    create();
    remittances.create.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 400,
        error: { code: 'INVALID_REMITTANCE', message: 'Please fix the highlighted fields.', errors: { memberId: 'Pick a member of this club.' } },
      })),
    );
    fill({ amount: '100', memberId: 'm1' });

    component.save();
    fixture.detectChanges();

    expect(component.errors.memberId).toBe('Pick a member of this club.');
    expect(text()).toContain('Pick a member of this club.');
  });

  it("keeps what was entered and says it wasn't saved when offline", () => {
    create();
    remittances.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    fill({ amount: '100', memberId: 'm1', note: 'Kept' });

    component.save();
    fixture.detectChanges();

    expect(text()).toContain("Couldn't reach the server. The remittance wasn't saved.");
    expect(component.form.amount).toBe('100');
    expect(component.form.note).toBe('Kept');
    expect(component.saving).toBeFalse();
  });
  describe('external recipients and proof photos (Story 2)', () => {
    const pick = (file: File) => component.onProofSelected({ target: { files: [file], value: 'x' } } as unknown as Event);
    const photo = new File([new Uint8Array(4_000_000)], 'IMG_0001.HEIC', { type: 'image/heic' });
    const prepared = new File([new Uint8Array(400_000)], 'IMG_0001.jpg', { type: 'image/jpeg' });

    it('needs a name for an external recipient, but no member', () => {
      create();

      fill({ amount: '100', recipientType: 'external', memberId: '', recipientName: '  ' });
      expect(component.canSave).toBeFalse();

      fill({ recipientName: 'Casa Verde Events' });
      expect(component.canSave).toBeTrue();
    });

    it('sends the external name and account, and no member', () => {
      create();
      remittances.create.and.returnValue(of(savedResponse));
      fill({ amount: '1500', recipientType: 'external', memberId: 'm1', recipientName: ' Casa Verde Events ', recipientAccount: ' GCash 0917 ' });

      component.save();

      const [sent] = remittances.create.calls.mostRecent().args;
      expect(sent).toEqual(jasmine.objectContaining({ recipientType: 'external', recipientName: 'Casa Verde Events', recipientAccount: 'GCash 0917' }));
      expect(sent.memberId).toBeUndefined();
    });

    it('does not send external fields for a member', () => {
      create();
      remittances.create.and.returnValue(of(savedResponse));
      fill({ amount: '100', memberId: 'm1', recipientName: 'left over', recipientAccount: 'left over' });

      component.save();

      const [sent] = remittances.create.calls.mostRecent().args;
      expect(sent.recipientName).toBeUndefined();
      expect(sent.recipientAccount).toBeUndefined();
    });

    it('prepares the proof photo on the device and uploads the prepared one (FR-014)', async () => {
      create();
      receiptImage.prepare.and.resolveTo(prepared);
      remittances.create.and.returnValue(of(savedResponse));
      fill({ amount: '100', memberId: 'm1' });

      await pick(photo);
      component.save();

      expect(receiptImage.prepare).toHaveBeenCalledOnceWith(photo);
      expect(component.proofFile).toBe(prepared);
      expect(remittances.create.calls.mostRecent().args[1]).toBe(prepared);
    });

    it('refuses a file that is not an image', async () => {
      create();

      await pick(new File(['%PDF'], 'proof.pdf', { type: 'application/pdf' }));

      expect(receiptImage.prepare).not.toHaveBeenCalled();
      expect(component.proofFile).toBeNull();
      expect(component.proofError).toBe(RECEIPT_ERROR_MESSAGES.UNSUPPORTED_FORMAT);
    });

    it('can remove the attached proof', async () => {
      create();
      receiptImage.prepare.and.resolveTo(prepared);
      await pick(photo);

      component.removeProof();

      expect(component.proofFile).toBeNull();
    });

    it('explains a photo the server refused', () => {
      create();
      remittances.create.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 413, error: { code: 'FILE_TOO_LARGE', message: 'server text' } })),
      );
      fill({ amount: '100', memberId: 'm1' });

      component.save();

      expect(component.saveError).toBe(RECEIPT_ERROR_MESSAGES.FILE_TOO_LARGE);
    });
  });

  describe('visibility (Story 3)', () => {
    it('offers Admins, Members and Public, defaulting to Members (D3)', () => {
      create();

      const options = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.visibility ion-segment-button'))
        .map((b) => b.getAttribute('value'));
      expect(options).toEqual(['admins', 'members', 'public']);
      expect(component.form.visibility).toBe('members');
    });

    it('sends the chosen visibility', () => {
      create();
      remittances.create.and.returnValue(of(savedResponse));
      fill({ amount: '100', memberId: 'm1', visibility: 'admins' });

      component.save();

      expect(remittances.create.calls.mostRecent().args[0].visibility).toBe('admins');
    });
  });
});
