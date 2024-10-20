import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';


import { CreateGroupPage } from './create-group.page';
import { CreateGroupPageRoutingModule } from './create-group-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateGroupPageRoutingModule
  ],
  declarations: [CreateGroupPage],
  exports: [CreateGroupPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateGroupPageModule {}
