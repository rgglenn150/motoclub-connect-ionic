import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { NotificationBellComponent } from './notification-bell.component';
import { NotificationPopoverComponent } from './notification-popover/notification-popover.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule
  ],
  declarations: [
    NotificationBellComponent,
    NotificationPopoverComponent
  ],
  exports: [
    NotificationBellComponent
  ]
})
export class NotificationBellModule {}