import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'me',
    loadChildren: () => import('./pages/me/me.module').then( m => m.MePageModule)
  },
  {
    path: 'clubs',
    loadChildren: () => import('./pages/clubs/create-club/create-club.module').then( m => m.CreateClubPageModule)
  },
  {
    path: 'create-event',
    loadChildren: () => import('./create-event/create-event.module').then( m => m.CreateEventPageModule)
  },
  {
    path: 'club-details/:id',
    loadChildren: () => import('./components/clubs/club-details/club-details.module').then( m => m.ClubDetailsPageModule)
  },
  {
    path: 'clubs/:id',
    loadChildren: () => import('./pages/clubs/club-home/club-home.module').then( m => m.ClubHomePageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
