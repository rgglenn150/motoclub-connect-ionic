import { Pipe, PipeTransform } from '@angular/core';

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

/**
 * How payment statuses are worded for people (spec 003; "Pending" from spec 006). The stored values stay
 * pending / confirmed / rejected; same mapping as the backend's STATUS_LABEL.
 */
const LABELS: Record<PaymentStatus, { title: string; lower: string }> = {
  confirmed: { title: 'Verified', lower: 'verified' },
  pending: { title: 'Pending', lower: 'pending' },
  rejected: { title: 'Rejected', lower: 'rejected' },
};

export function paymentStatusLabel(status: PaymentStatus, form: 'title' | 'lower' = 'title'): string {
  const label = LABELS[status];
  return label ? label[form] : (status ?? '');
}

@Pipe({
  name: 'paymentStatus'
})
export class PaymentStatusPipe implements PipeTransform {
  transform(status: PaymentStatus, form: 'title' | 'lower' = 'title'): string {
    return paymentStatusLabel(status, form);
  }
}
