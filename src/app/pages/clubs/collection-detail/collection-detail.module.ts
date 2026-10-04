import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CollectionDetailPageRoutingModule } from './collection-detail-routing.module';
import { CollectionDetailPage } from './collection-detail.page';
import { PaymentDetailsComponent } from './payment-details/payment-details.component';
import { BulkVerifyComponent } from './bulk-verify/bulk-verify.component';
import { EditCollectionComponent } from './edit-collection/edit-collection.component';
import { CollectionProgressModule } from '../../../components/collection-progress/collection-progress.module';
import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, CollectionDetailPageRoutingModule, CollectionProgressModule, SharedModule],
  declarations: [CollectionDetailPage, PaymentDetailsComponent, BulkVerifyComponent, EditCollectionComponent],
})
export class CollectionDetailPageModule {}
