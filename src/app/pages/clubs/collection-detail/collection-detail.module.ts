import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CollectionDetailPageRoutingModule } from './collection-detail-routing.module';
import { CollectionDetailPage } from './collection-detail.page';
import { CollectionProgressModule } from '../../../components/collection-progress/collection-progress.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, CollectionDetailPageRoutingModule, CollectionProgressModule],
  declarations: [CollectionDetailPage],
})
export class CollectionDetailPageModule {}
