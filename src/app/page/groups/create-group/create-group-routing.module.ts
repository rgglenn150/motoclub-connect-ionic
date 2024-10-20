import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CreateGroupPage } from './create-group.page';
import { CreateGroupPageModule } from './create-group.module';
import { FormsModule } from '@angular/forms';

const routes: Routes = [
  {
    path: 'create',
    component: CreateGroupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateGroupPageRoutingModule {}
