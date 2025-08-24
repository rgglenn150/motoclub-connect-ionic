import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LoginPageRoutingModule } from './login-routing.module';

import { LoginPage } from './login.page';
import { LoadingSpinnerComponent } from 'src/app/components/utils/loading-spinner/loading-spinner.component';
import { LoadingSpinnerModule } from 'src/app/components/utils/loading-spinner/loading-spinner.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LoginPageRoutingModule,ReactiveFormsModule,
    LoadingSpinnerModule
  ],
  declarations: [LoginPage],
  schemas:[CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginPageModule {}
