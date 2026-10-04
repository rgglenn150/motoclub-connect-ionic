import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController, IonicModule } from '@ionic/angular';
import { of, Subject, throwError } from 'rxjs';

import { EditCollectionComponent } from './edit-collection.component';
import { CollectionService } from '../../../../service/collection.service';
import { Collection } from '../../../../models/collection.model';

const collection = (overrides: Partial<Collection> = {}): Collection => ({
  _id: 'col1',
  club: 'club1',
  name: 'Redcross Donations',
  description: 'Typhoon relief',
  targetAmount: 5000,
  visibility: 'members_only',
  status: 'open',
  paymentCount: 0,
  confirmedTotal: 0,
  pendingTotal: 0,
  totalCollected: 0,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('EditCollectionComponent (spec 006, US1)', () => {
  let fixture: ComponentFixture<EditCollectionComponent>;
  let component: EditCollectionComponent;
  let collectionService: jasmine.SpyObj<CollectionService>;
  let alertController: jasmine.SpyObj<AlertController>;
  let confirmRole: string;
  let saved: Collection[];
  let cancelled: number;

  function create(input: Collection = collection()) {
    fixture = TestBed.createComponent(EditCollectionComponent);
    component = fixture.componentInstance;
    component.collection = input;
    saved = [];
    cancelled = 0;
    component.saved.subscribe((c: Collection) => saved.push(c));
    component.cancelled.subscribe(() => cancelled++);
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  beforeEach(async () => {
    collectionService = jasmine.createSpyObj('CollectionService', ['updateCollection']);
    collectionService.updateCollection.and.callFake((_id, edit) =>
      of({ collection: collection({ ...edit, targetAmount: edit.targetAmount ?? undefined }) })
    );
    confirmRole = 'confirm';
    alertController = jasmine.createSpyObj('AlertController', ['create']);
    alertController.create.and.callFake(async () => ({
      present: () => Promise.resolve(),
      onDidDismiss: () => Promise.resolve({ role: confirmRole }),
    }) as any);

    await TestBed.configureTestingModule({
      declarations: [EditCollectionComponent],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        { provide: CollectionService, useValue: collectionService },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();
  });

  it('starts from the current values (AC1)', () => {
    create();
    expect(component.form).toEqual({
      name: 'Redcross Donations',
      description: 'Typhoon relief',
      target: '5000',
      visibility: 'members_only',
    });
    expect(component.canSave).toBeTrue();
  });

  it('flags bad existing data as soon as it opens (red-team F3)', () => {
    create(collection({ name: 'x'.repeat(120) }));
    expect(component.errors.name).toBe('Name must be 100 characters or fewer.');
    expect(text()).toContain('Name must be 100 characters or fewer.');
    expect(component.canSave).toBeFalse();
  });

  describe('checks fields with the server limits (AC4)', () => {
    beforeEach(() => create());

    const set = (patch: Partial<EditCollectionComponent['form']>) => {
      component.form = { ...component.form, ...patch };
      component.validate();
      fixture.detectChanges();
    };

    it('requires a name', () => {
      set({ name: '   ' });
      expect(text()).toContain('Name is required.');
      expect(component.canSave).toBeFalse();
    });

    it('limits the description to 500 characters', () => {
      set({ description: 'y'.repeat(501) });
      expect(component.errors.description).toBe('Description must be 500 characters or fewer.');
      set({ description: 'y'.repeat(500) });
      expect(component.errors.description).toBeUndefined();
    });

    for (const bad of ['0', '-5', '1.234', '10000000.01', 'abc']) {
      it(`refuses target ${bad}`, () => {
        set({ target: bad });
        expect(component.errors.targetAmount).toBe(
          'Target must be a positive amount up to ₱10,000,000 with at most 2 decimals.'
        );
        expect(component.canSave).toBeFalse();
      });
    }

    it('allows an empty target', () => {
      set({ target: '' });
      expect(component.errors.targetAmount).toBeUndefined();
    });
  });

  it('saves trimmed values and an empty target as null (AC2, AC5)', async () => {
    create(collection({ visibility: 'public' }));
    component.form = { name: '  New name ', description: '  Note ', target: '', visibility: 'public' };
    component.validate();

    await component.save();

    expect(collectionService.updateCollection).toHaveBeenCalledOnceWith('col1', {
      name: 'New name',
      description: 'Note',
      targetAmount: null,
      visibility: 'public',
    });
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe('New name');
  });

  it('asks before making a members-only collection public, and saves only on confirm (red-team F1)', async () => {
    create();
    component.form = { ...component.form, visibility: 'public' };

    confirmRole = 'cancel';
    await component.save();
    expect(alertController.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'Anyone with the link will see payer names and amounts. Make public?',
      })
    );
    expect(collectionService.updateCollection).not.toHaveBeenCalled();

    confirmRole = 'confirm';
    await component.save();
    expect(collectionService.updateCollection).toHaveBeenCalledTimes(1);
    expect(saved.length).toBe(1);
  });

  it('does not ask when visibility is unchanged or becomes members-only', async () => {
    create(collection({ visibility: 'public' }));
    component.form = { ...component.form, visibility: 'members_only' };
    await component.save();
    expect(alertController.create).not.toHaveBeenCalled();
    expect(collectionService.updateCollection).toHaveBeenCalled();
  });

  it('shows server field errors on the matching fields', async () => {
    create();
    collectionService.updateCollection.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 400,
        error: { code: 'INVALID_COLLECTION', message: 'Please fix the highlighted fields.', errors: { name: 'Name is required.' } },
      }))
    );

    await component.save();
    fixture.detectChanges();

    expect(component.errors.name).toBe('Name is required.');
    expect(text()).toContain('Name is required.');
    expect(saved.length).toBe(0);
  });

  it('keeps the edits and offers a retry after a network failure', async () => {
    create();
    component.form = { ...component.form, name: 'Edited' };
    collectionService.updateCollection.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    await component.save();
    fixture.detectChanges();

    expect(text()).toContain("Couldn't save. Check your connection and try again.");
    expect(component.form.name).toBe('Edited');
    expect(component.canSave).toBeTrue();
  });

  it('shows progress and ignores a second save while saving', async () => {
    create();
    const pending = new Subject<{ collection: Collection }>();
    collectionService.updateCollection.and.returnValue(pending);

    const first = component.save();
    await component.save();
    fixture.detectChanges();

    expect(component.saving).toBeTrue();
    expect(component.canSave).toBeFalse();
    expect(collectionService.updateCollection).toHaveBeenCalledTimes(1);

    pending.next({ collection: collection() });
    pending.complete();
    await first;
    expect(component.saving).toBeFalse();
  });

  it('cancels without saving (AC6)', () => {
    create();
    component.form = { ...component.form, name: 'Changed' };
    component.onCancel();
    expect(cancelled).toBe(1);
    expect(collectionService.updateCollection).not.toHaveBeenCalled();
  });
});
