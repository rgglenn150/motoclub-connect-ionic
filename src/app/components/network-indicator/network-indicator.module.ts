import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NetworkIndicatorComponent } from './network-indicator.component';

@NgModule({
  declarations: [NetworkIndicatorComponent],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [NetworkIndicatorComponent]
})
export class NetworkIndicatorModule { }