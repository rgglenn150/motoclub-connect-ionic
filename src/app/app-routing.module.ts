import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard]
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
    loadChildren: () => import('./pages/me/me.module').then( m => m.MePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'clubs',
    loadChildren: () => import('./pages/clubs/create-club/create-club.module').then( m => m.CreateClubPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'create-event/:clubId',
    loadChildren: () => import('./pages/events/create-event/create-event.module').then( m => m.CreateEventPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'club-details/:id',
    loadChildren: () => import('./components/clubs/club-details/club-details.module').then( m => m.ClubDetailsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'clubs/:id',
    loadChildren: () => import('./pages/clubs/club-home/club-home.module').then( m => m.ClubHomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'notifications',
    loadChildren: () => import('./pages/notifications/notifications.module').then( m => m.NotificationsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'user/edit-profile',
    loadChildren: () => import('./pages/user/edit-profile/edit-profile.module').then( m => m.EditProfilePageModule),
    canActivate: [AuthGuard]
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
