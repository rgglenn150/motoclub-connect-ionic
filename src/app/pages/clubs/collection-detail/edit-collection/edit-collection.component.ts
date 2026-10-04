import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CollectionService } from '../../../../service/collection.service';
import {
  Collection,
  CollectionEdit,
  CollectionEditError,
  CollectionEditField,
} from '../../../../models/collection.model';

// Same limits as the server (spec 006 FR-006, contracts §1).
const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;
const MAX_TARGET = 10_000_000;
const MESSAGES = {
  nameRequired: 'Name is required.',
  nameTooLong: `Name must be ${NAME_MAX} characters or fewer.`,
  description: `Description must be ${DESCRIPTION_MAX} characters or fewer.`,
  target: 'Target must be a positive amount up to ₱10,000,000 with at most 2 decimals.',
};

export interface EditCollectionForm {
  name: string;
  description: string;
  /** As typed; '' means no target. */
  target: string;
  visibility: Collection['visibility'];
}

/**
 * Edit a collection's name, description, target and visibility (spec 006 US1).
 * Checks itself as soon as it opens so bad existing data is visible at once
 * (red-team F3), and confirms before a collection becomes public (F1).
 */
@Component({
  selector: 'app-edit-collection',
  templateUrl: './edit-collection.component.html',
  styleUrls: ['./edit-collection.component.scss'],
})
export class EditCollectionComponent implements OnInit {
  @Input() collection!: Collection;
  @Output() saved = new EventEmitter<Collection>();
  @Output() cancelled = new EventEmitter<void>();

  form: EditCollectionForm = { name: '', description: '', target: '', visibility: 'members_only' };
  errors: Partial<Record<CollectionEditField, string>> = {};
  saving = false;
  saveError: string | null = null;

  constructor(
    private collectionService: CollectionService,
    private alertController: AlertController,
  ) {}

  ngOnInit() {
    const c = this.collection;
    this.form = {
      name: c.name ?? '',
      description: c.description ?? '',
      target: c.targetAmount != null ? String(c.targetAmount) : '',
      visibility: c.visibility,
    };
    this.validate();
  }

  get canSave(): boolean {
    return !this.saving && Object.keys(this.errors).length === 0;
  }

  validate() {
    const errors: Partial<Record<CollectionEditField, string>> = {};
    const name = this.form.name.trim();
    if (!name) errors.name = MESSAGES.nameRequired;
    else if (name.length > NAME_MAX) errors.name = MESSAGES.nameTooLong;
    if (this.form.description.trim().length > DESCRIPTION_MAX) errors.description = MESSAGES.description;
    const target = String(this.form.target ?? '').trim();
    if (target && !this.isValidTarget(target)) errors.targetAmount = MESSAGES.target;
    this.errors = errors;
    this.saveError = null;
  }

  onCancel() {
    this.cancelled.emit();
  }

  async save() {
    this.validate();
    if (!this.canSave) return;
    this.saving = true;
    try {
      const goingPublic =
        this.collection.visibility !== 'public' && this.form.visibility === 'public';
      if (goingPublic && !(await this.confirmPublic())) return;

      const res = await firstValueFrom(
        this.collectionService.updateCollection(this.collection._id, this.toEdit())
      );
      this.saved.emit(res.collection);
    } catch (err) {
      this.showSaveError(err as HttpErrorResponse);
    } finally {
      this.saving = false;
    }
  }

  private toEdit(): CollectionEdit {
    const target = String(this.form.target ?? '').trim();
    return {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      targetAmount: target ? Number(target) : null,
      visibility: this.form.visibility,
    };
  }

  private isValidTarget(text: string): boolean {
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return false;
    const value = Number(text);
    return value > 0 && value <= MAX_TARGET;
  }

  private async confirmPublic(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Make this collection public?',
      message: 'Anyone with the link will see payer names and amounts. Make public?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Make public', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private showSaveError(err: HttpErrorResponse) {
    const body = err.error as CollectionEditError | null;
    if (err.status === 400 && body?.errors) {
      this.errors = body.errors;
      return;
    }
    this.saveError =
      err.status === 0
        ? "Couldn't save. Check your connection and try again."
        : (err.error as { message?: string } | null)?.message ?? "Couldn't save. Please try again.";
  }
}
