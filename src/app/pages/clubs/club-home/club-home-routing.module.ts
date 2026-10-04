import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ClubHomePage } from './club-home.page';

const routes: Routes = [
  {
    path: '',
    component: ClubHomePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClubHomePageRoutingModule {}
