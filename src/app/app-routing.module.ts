import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ClubAdminGuard } from './guards/club-admin.guard';

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
    path: 'clubs/:id',
    loadChildren: () => import('./pages/clubs/club-home/club-home.module').then( m => m.ClubHomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'clubs/:clubId/collection/:collectionId',
    loadChildren: () => import('./pages/clubs/collection-detail/collection-detail.module').then(m => m.CollectionDetailPageModule),
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
  },
  {
    path: 'edit-club/:id',
    loadChildren: () => import('./pages/clubs/edit-club/edit-club.module').then( m => m.EditClubPageModule),
    canActivate: [AuthGuard, ClubAdminGuard]
  },
  {
    path: 'official-members/:clubId',
    loadChildren: () => import('./pages/official-members/official-members.module').then( m => m.OfficialMembersPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'official-member-detail/:clubId/:memberId',
    loadChildren: () => import('./pages/official-members/official-member-detail/official-member-detail.module').then( m => m.OfficialMemberDetailPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'claim-requests/:clubId',
    loadChildren: () => import('./pages/claim-requests/claim-requests.module').then( m => m.ClaimRequestsPageModule),
    canActivate: [AuthGuard, ClubAdminGuard]
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
