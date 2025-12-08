import { Component, OnInit } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Course } from '../../models/course.model';

@Component({
  selector: 'app-courses',
  templateUrl: 'course.component.html',
  standalone: true,
  imports: [DialogModule, ButtonModule, CardModule, TableModule, CommonModule]
})
export class CoursesComponent implements OnInit {

  courseDialog = false;
  studentsDialog = false;
  examsDialog = false;

  selectedCourse: Course | null = null;
  courses: Course[] = [];

  // 🟦 API اصلی
  private apiBase = "https://cheap-tones-intensive-wives.trycloudflare.com/api";

  // 🟩 شناسۀ استاد (PathVariable)
  teacherId = 1; // ← می‌تونی از login مقدار بدی

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  // 📌 گرفتن لیست دروس استاد از سرور
  loadCourses(): void {
    this.http.get<Course[]>(`${this.apiBase}/teachers/${this.teacherId}/courses`)
      .subscribe({
        next: (data) => {
          this.courses = data;
          console.log("📘 لیست دروس دریافت شد:", data);
        },
        error: (err) => {
          console.error("❌ خطا در دریافت دروس:", err);
        }
      });
  }

  openCourse(course: Course) {
    this.selectedCourse = course;
    this.courseDialog = true;
  }

  openStudents() {
    this.courseDialog = false;
    this.studentsDialog = true;
  }

  openExams() {
    this.courseDialog = false;
    this.examsDialog = true;
  }
}
