import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CollectionProgressComponent } from './collection-progress.component';

@NgModule({
  declarations: [CollectionProgressComponent],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [CollectionProgressComponent]
})
export class CollectionProgressModule { }
