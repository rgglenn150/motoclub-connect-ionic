import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Remittance, RemittanceSummary, RemittanceVisibility } from '../../../../models/remittance.model';

const VISIBILITY_LABEL: Record<RemittanceVisibility, string> = {
  admins: 'Admins only',
  members: 'Members',
  public: 'Public',
};

/**
 * Remittance summary strip and list on the collection page (spec 009 Story 1,
 * Story 3). Shows the API's figures as sent; the page owns loading them.
 */
@Component({
  selector: 'app-remittances',
  templateUrl: './remittances.component.html',
  styleUrls: ['./remittances.component.scss'],
})
export class RemittancesComponent {
  @Input() summary: RemittanceSummary | null = null;
  @Input() remittances: Remittance[] = [];
  @Input() loading = false;
  @Input() error = false;
  @Output() retry = new EventEmitter<void>();
  @Output() open = new EventEmitter<Remittance>();

  visibilityLabel(remittance: Remittance): string {
    return VISIBILITY_LABEL[remittance.visibility];
  }
}
