import { Routes } from '@angular/router';
import { RoleSelectComponent } from './features/role-select/role-select.component';
import { StoreLoginComponent } from './features/store-login/store-login.component';
import { ManagementLoginComponent } from './features/management-login/management-login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { HeadCrewComponent } from './features/head-crew/head-crew.component';
import { ManagementComponent } from './features/management/management.component';
import { authGuard } from './core/guards/auth.guard';
import { CashCountComponent } from './features/cash-count/cash-count.component';

export const routes: Routes = [
  { path: '', component: RoleSelectComponent },

  {
    path: 'login/crew',
    component: StoreLoginComponent,
    data: { loginAs: 'crew', landingPath: '/dashboard', pageTitle: 'Crew Login' },
  },
  {
    path: 'login/head-crew',
    component: StoreLoginComponent,
    data: { loginAs: 'head_crew', landingPath: '/head-crew', pageTitle: 'Head Crew Login' },
  },
  { path: 'login/management', component: ManagementLoginComponent },

  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'cash-count', component: CashCountComponent, canActivate: [authGuard] },
  { path: 'head-crew', component: HeadCrewComponent, canActivate: [authGuard] },
  { path: 'management', component: ManagementComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: '' },
];