import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ClubDetailsPage } from './club-details.page';

const routes: Routes = [
  {
    path: '',
    component: ClubDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClubDetailsPageRoutingModule {}
