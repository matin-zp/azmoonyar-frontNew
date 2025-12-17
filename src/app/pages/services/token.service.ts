// src/app/services/token.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  getToken(): string | null {
    // فقط در مرورگر localStorage وجود دارد
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token') || 
             localStorage.getItem('access_token') ||
             sessionStorage.getItem('token') ||
             sessionStorage.getItem('access_token');
    }
    return null;
  }

  setToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
  }

  removeToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('access_token');
    }
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }
}