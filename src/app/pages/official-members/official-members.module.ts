import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OfficialMembersPageRoutingModule } from './official-members-routing.module';
import { NetworkIndicatorModule } from '../../components/network-indicator/network-indicator.module';
import { CsvImportModalComponent } from '../../components/csv-import-modal/csv-import-modal.component';

import { OfficialMembersPage } from './official-members.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    OfficialMembersPageRoutingModule,
    NetworkIndicatorModule,
    SharedModule
  ],
  declarations: [OfficialMembersPage, CsvImportModalComponent]
})
export class OfficialMembersPageModule {}
