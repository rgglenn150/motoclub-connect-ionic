import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CollectionProgressComponent } from './collection-progress.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [CollectionProgressComponent],
  imports: [
    CommonModule,
    IonicModule,
    SharedModule
  ],
  exports: [CollectionProgressComponent]
})
export class CollectionProgressModule { }
