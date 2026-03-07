import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OfficialMembersPage } from './official-members.page';

const routes: Routes = [
  {
    path: '',
    component: OfficialMembersPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OfficialMembersPageRoutingModule {}
