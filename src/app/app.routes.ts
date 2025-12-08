// [file name]: app.routes.ts
// [file content begin]
import { Routes } from '@angular/router';
import { NavbarComponent } from './layouts/navbar-layout';

export const routes: Routes = [

  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // LOGIN
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  
  // TEACHER DASHBOARD
  {
    path: 'teacher-dashboard',
    loadComponent: () =>
      import('./pages/teacher-dashboard/teacher-dashboard.component')
        .then(c => c.TeacherDashboardComponent)
  },
  
  // COURSE DETAILS
  {
    path: 'courses/:id',
    loadComponent: () =>
      import('./pages/course-details/course-details.component')
        .then(c => c.CourseDetailsComponent)
  },

  // NAVBAR LAYOUT
  {
    path: '',
    component: NavbarComponent,
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('./pages/home/home.routes').then(r => r.homeRoutes)
      },
      // {
      //   path: 'studentDashboard',
      //   loadChildren: () =>
      //     import('./pages/studentDashbord/studentDashbord.routes')
      //       .then(r => r.studentDashboardRoutes)  // ← نام export صحیح باید این باشد
      // },
      {
        path: 'profile',
        loadChildren: () =>
          import('./pages/profile/profile.routes').then(r => r.profileRautes)
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
// [file content end]