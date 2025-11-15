// auth.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';

export const AUTH_ROUTES: Routes = [
  { 
    path: 'login', 
    component: LoginComponent,
    data: { animation: 'LoginPage' }
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    data: { animation: 'RegisterPage' }
  }
];