// src/app/pages/services/auth.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // فقط یک بار
import { tap, of, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://localhost:8081';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ================= Token Handling =================
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  getToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem('token') || 
             localStorage.getItem('access_token') ||
             sessionStorage.getItem('token') ||
             sessionStorage.getItem('access_token');
    }
    return null;
  }

  saveToken(token: string): void {
    if (this.isBrowser()) {
      localStorage.setItem('token', token);
    }
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  getUserRole(): 'teacher' | 'student' | null {
    const token = this.getToken();
    if (!token) return null;
    
    // اینجا می‌توانید از توکن نقش را استخراج کنید
    // به صورت موقت، فرض می‌کنیم اگر توکن دارد می‌تواند دانشجو باشد
    return 'student';
  }

  logout(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('access_token');
    window.location.href = '/login';
  }

  // ================= Login =================
  login(username: string, password: string, role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, { username, password, role })
      .pipe(
        tap((res: any) => {
          if (res?.token) this.saveToken(res.token);
        })
      );
  }

  // ================= Dashboard API =================
  getTeacherDashboard(): Observable<any> {
    const token = this.getToken();

    if (!token) {
      console.warn("⛔ NO TOKEN FOUND → returning null observable");
      return of(null);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${this.baseUrl}/api/teachers/my-dashboard`, { headers });
  }

  getStudentDashboard(): Observable<any> {
    const token = this.getToken();

    if (!token) {
      console.warn("⛔ NO TOKEN FOUND → returning null observable");
      return of(null);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${this.baseUrl}/api/students/my-dashboard`, { headers });
  }

  // متد کمکی برای گرفتن هدرهای احراز هویت
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    return new HttpHeaders();
  }
}