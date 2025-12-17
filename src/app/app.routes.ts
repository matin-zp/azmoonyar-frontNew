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
  
  // STUDENT DASHBOARD
  {
    path: 'student-dashboard',
    loadComponent: () =>
      import('./pages/student-dashboard/student-dashboard.component')
        .then(c => c.StudentDashboardComponent)
  },
  
  // COURSE DETAILS
  {
    path: 'courses/:id',
    loadComponent: () =>
      import('./pages/course-details/course-details.component')
        .then(c => c.CourseDetailsComponent)
  },
  
  // CREATE SURVEY (جدید)
  {
    path: 'course/:courseId/create-survey',
    loadComponent: () =>
      import('./pages/create-survey/create-survey.component')
        .then(c => c.CreateSurveyComponent)
  },
  
  // EXAM RESERVATION
  {
    path: 'course/:courseId/new-exam',
    loadComponent: () =>
      import('./pages/exam-reservation/exam-reservation.component')
        .then(m => m.ExamReservationComponent)
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
      {
        path: 'profile',
        loadChildren: () =>
          import('./pages/profile/profile.routes').then(r => r.profileRautes)
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];