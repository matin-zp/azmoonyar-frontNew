import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, of, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl = 'http://localhost:8081';

  constructor(private http: HttpClient) {}

  // ================= Token Handling =================
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  getToken(): string | null {
    return this.isBrowser() ? localStorage.getItem('token') : null;
  }

  saveToken(token: string): void {
    if (this.isBrowser()) localStorage.setItem('token', token);
  }

  logout(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem('token');
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
  // ============================================
  //  ⚠️ سازگاری با نسخه‌های قدیمی
  // ============================================
  // getTeacherDashboard(): Observable<any> {
  //   return this.getDashboard();
  // }

}