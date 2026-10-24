import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController } from '@ionic/angular';
import { RemittanceService } from '../../../../service/remittance.service';
import { Remittance, RemittanceChangeResponse, RemittanceVisibility } from '../../../../models/remittance.model';

const VOID_REASON_MAX = 200;

const VISIBILITY_LABEL: Record<RemittanceVisibility, string> = {
  admins: 'Admins only',
  members: 'Club members',
  public: 'Public',
};

/**
 * A remittance's details (spec 009 Story 2). Account details, the proof photo
 * and who recorded it arrive only for club admins (D6), so the template shows
 * whatever the API sent. Admins can void an active record with a reason (Story 4).
 */
@Component({
  selector: 'app-remittance-details',
  templateUrl: './remittance-details.component.html',
  styleUrls: ['./remittance-details.component.scss'],
})
export class RemittanceDetailsComponent {
  @Input() remittance!: Remittance;
  @Output() voided = new EventEmitter<RemittanceChangeResponse>();

  voiding = false;
  voidError: string | null = null;

  constructor(
    private remittanceService: RemittanceService,
    private alertController: AlertController,
  ) {}

  get canVoid(): boolean {
    return this.remittance.detailsVisible && this.remittance.status === 'active';
  }

  get visibilityLabel(): string {
    return VISIBILITY_LABEL[this.remittance.visibility];
  }

  /** Voiding is final, so it asks for a reason first (D4). */
  async confirmVoid() {
    if (!this.canVoid) return;
    const alert = await this.alertController.create({
      header: 'Void remittance?',
      message: "It stays on record as Voided and no longer counts as remitted. This can't be undone.",
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason (required)', attributes: { maxlength: VOID_REASON_MAX } }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Void',
          role: 'destructive',
          handler: (data: { reason?: string }) => {
            const reason = (data?.reason ?? '').trim();
            // Keep the prompt open until there is a reason.
            if (!reason) return false;
            this.sendVoid(reason);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private sendVoid(reason: string) {
    this.voiding = true;
    this.voidError = null;
    this.remittanceService.void(this.remittance._id, reason).subscribe({
      next: (res) => {
        this.voiding = false;
        this.voided.emit(res);
      },
      error: (err: HttpErrorResponse) => {
        this.voiding = false;
        this.voidError =
          err.status === 0
            ? "Couldn't reach the server. The remittance wasn't voided."
            : err.error?.message || "The remittance wasn't voided. Please try again.";
      },
    });
  }

  openProof() {
    if (this.remittance.proofUrl) window.open(this.remittance.proofUrl, '_blank', 'noopener');
  }
}
