import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloudinaryUrlPipe } from '../pipes/cloudinary-url.pipe';

@NgModule({
  declarations: [CloudinaryUrlPipe],
  imports: [CommonModule],
  exports: [CloudinaryUrlPipe, CommonModule]
})
export class SharedModule {}
