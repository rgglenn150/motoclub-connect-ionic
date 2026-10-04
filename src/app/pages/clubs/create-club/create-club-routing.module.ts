import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CreateClubPage } from './create-club.page';
import { CreateClubPageModule } from './create-club.module';
import { FormsModule } from '@angular/forms';

const routes: Routes = [
  {
    path: 'create',
    component: CreateClubPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateClubPageRoutingModule {}
