import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Payment } from '../../../../models/payment.model';

/**
 * Body of the payment dialog (spec 003, US4/US5): every detail of a payment and
 * its receipt, plus the actions this viewer may take. Presentational only; the
 * collection page confirms and performs the actions.
 */
@Component({
  selector: 'app-payment-details',
  templateUrl: './payment-details.component.html',
  styleUrls: ['./payment-details.component.scss'],
})
export class PaymentDetailsComponent implements OnChanges {
  @Input() payment!: Payment;
  /** Admin, and the payment is still pending. */
  @Input() canReview = false;
  /** Admin. */
  @Input() canDelete = false;
  /** An action is in flight: disable the buttons. */
  @Input() busy = false;

  @Output() verify = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
  @Output() copyRef = new EventEmitter<void>();
  @Output() openReceipt = new EventEmitter<void>();

  receiptFailed = false;

  ngOnChanges() {
    this.receiptFailed = false;
  }

  retryReceipt() {
    this.receiptFailed = false;
  }
}
