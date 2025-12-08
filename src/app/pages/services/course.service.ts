import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Course } from '../../models/course.model';

@Injectable({
  providedIn: 'root'
})
export class CoursesService {

  private readonly baseUrl = 'https://cloth-conviction-sticks-gamma.trycloudflare.com';

  constructor(private http: HttpClient) {}

  // ----------------------------------------------------
  // 🟦 خواندن Token از localStorage
  // ----------------------------------------------------
  private authHeaders() {
    const token = localStorage.getItem('auth_token') ?? '';
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }),
    };
  }

  // ----------------------------------------------------
  // 🟦 تعیین نقش کاربر (teacher / student)
  // ----------------------------------------------------
  private getUserRole(): 'teacher' | 'student' {
    const role = localStorage.getItem('auth_role');
    return role === 'student' ? 'student' : 'teacher';
  }

  // ----------------------------------------------------
  // 🟩 دریافت لیست درس‌ها — اتوماتیک بر اساس نقش
  // ----------------------------------------------------
  getMyCourses(): Observable<Course[]> {
    const role = this.getUserRole(); // teacher | student

    return this.http.get<Course[]>(
      `${this.baseUrl}/api/${role}s/my-courses`,
      this.authHeaders()
    );
  }

  // ----------------------------------------------------
  // 🟦 اگر بخواهی دستی فراخوانی جدا داشته باشی
  // ----------------------------------------------------
  getTeacherCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(
      `${this.baseUrl}/api/teachers/my-courses`,
      this.authHeaders()
    );
  }

  getStudentCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(
      `${this.baseUrl}/api/students/my-courses`,
      this.authHeaders()
    );
  }
}
