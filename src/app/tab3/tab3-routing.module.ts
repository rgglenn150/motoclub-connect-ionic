import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Tab3Page } from './tab3.page';
import { Tab3PageModule } from './tab3.module';
import { MePageModule } from '../pages/me/me.module';

const routes: Routes = [
  {
    path: '',
    component: Tab3Page,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes),Tab3PageModule],
  exports: [RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab3PageRoutingModule {}
