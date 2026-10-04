import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClaimRequestsPage } from './claim-requests.page';

const routes: Routes = [
  {
    path: '',
    component: ClaimRequestsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClaimRequestsPageRoutingModule {}
