import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TabsPageRoutingModule } from './tabs-routing.module';

import { TabsPage } from './tabs.page';
import { HomePageModule } from '../pages/home/home.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,ReactiveFormsModule,
    TabsPageRoutingModule,HomePageModule
  ],
  declarations: [TabsPage]
})
export class TabsPageModule {}
