import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloudinaryUrlPipe } from '../pipes/cloudinary-url.pipe';
import { PaymentStatusPipe } from '../pipes/payment-status.pipe';

@NgModule({
  declarations: [CloudinaryUrlPipe, PaymentStatusPipe],
  imports: [CommonModule],
  exports: [CloudinaryUrlPipe, PaymentStatusPipe, CommonModule]
})
export class SharedModule {}
