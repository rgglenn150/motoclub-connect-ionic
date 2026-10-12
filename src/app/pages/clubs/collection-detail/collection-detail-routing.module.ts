import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CollectionDetailPage } from './collection-detail.page';
import { closeDialogsGuard } from '../../../guards/close-dialogs.guard';

// Serves both collection routes (with and without /payment) in app-routing.
const routes: Routes = [{ path: '', component: CollectionDetailPage, canDeactivate: [closeDialogsGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CollectionDetailPageRoutingModule {}
