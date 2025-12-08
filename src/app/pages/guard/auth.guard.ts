// import { Injectable, inject } from '@angular/core';
// import { Router, UrlTree } from '@angular/router';
// import { AuthService } from '../services/auth.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthGuard {
  
//   private auth = inject(AuthService);
//   private router = inject(Router);

//   canActivate(): boolean | UrlTree {
//     return this.auth.isLoggedIn()
//       ? true
//       : this.router.createUrlTree(['/login']);
//   }
// }
