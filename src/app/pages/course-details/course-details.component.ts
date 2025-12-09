import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import * as jalaali from 'jalaali-js';

// مدل‌ها
interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  studentNumber: string;
}

interface Room {
  id: number;
  name: string;
  capacity: number;
}

interface Exam {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  room: Room;
}

interface CourseDetails {
  id: number;
  courseName: string;
  courseCode: string;
  teacher: Teacher;
  students: Student[];
  exams: Exam[];
  dayOfWeek: string;
  roomC: string;
  timeC: string;
}

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css']
})
export class CourseDetailsComponent implements OnInit, OnDestroy {
  course: CourseDetails | null = null;
  loading = true;
  errorMessage = '';
  
  // داده‌های آماری
  stats = {
    totalStudents: 0,
    totalExams: 0,
    todayExams: 0,
    upcomingExams: 0
  };
  
  // جدول‌بندی دانشجویان (مرتب شده بر اساس نام خانوادگی)
  studentsPerPage = 10;
  currentPage = 1;
  totalPages = 1;
  paginatedStudents: Student[] = [];
  
  // لیست دانشجویان مرتب شده بر اساس نام خانوادگی
  sortedStudents: Student[] = [];
  
  // امتحان‌های آینده
  upcomingExams: any[] = [];
  
  private destroy$ = new Subject<void>();
  private courseId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    
    if (!this.courseId) {
      this.errorMessage = 'شناسه درس نامعتبر است';
      this.loading = false;
      return;
    }
    
    this.loadCourseDetails();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * بارگذاری جزئیات درس
   */
  private loadCourseDetails(): void {
    this.loading = true;
    
    this.http.get<CourseDetails>(`http://localhost:8081/api/courses/${this.courseId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.course = data;
          this.sortStudentsByLastName(); // مرتب‌سازی دانشجویان
          this.calculateStats();
          this.prepareUpcomingExams();
          this.updateStudentPagination();
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ خطا در دریافت اطلاعات درس:', err);
          this.errorMessage = 'خطا در بارگذاری اطلاعات درس';
          this.loading = false;
        }
      });
  }

  /**
   * مرتب‌سازی دانشجویان بر اساس نام خانوادگی
   */
  private sortStudentsByLastName(): void {
    if (!this.course) return;
    
    this.sortedStudents = [...this.course.students].sort((a, b) => {
      // استفاده از localeCompare برای مرتب‌سازی فارسی
      return a.lastName.localeCompare(b.lastName, 'fa');
    });
  }

  /**
   * محاسبه آمار
   */
  private calculateStats(): void {
    if (!this.course) return;
    
    const now = new Date();
    const upcomingExams = this.course.exams.filter(exam => 
      new Date(exam.startDate) > now
    );
    
    this.stats = {
      totalStudents: this.sortedStudents.length,
      totalExams: this.course.exams.length,
      todayExams: this.course.exams.filter(exam => {
        const nowDate = new Date();
        nowDate.setHours(0, 0, 0, 0);   // فقط روز امروز

        const start = new Date(exam.startDate);
        const end = new Date(exam.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999); // پایان روز امتحان

        return nowDate >= start && nowDate <= end;
      }
      ).length,
      upcomingExams: upcomingExams.length
    };
  }

  /**
   * آماده‌سازی امتحان‌های آینده
   */
  private prepareUpcomingExams(): void {
    if (!this.course) return;
    
    const now = new Date();
    this.upcomingExams = this.course.exams
      .filter(exam => new Date(exam.startDate) > now)
      .map(exam => ({
        ...exam,
        persianDate: this.convertToJalaali(exam.startDate),
        dayOfWeek: this.getPersianDay(exam.startDate),
        timeRange: `${this.formatTime(exam.startDate)} - ${this.formatTime(exam.endDate)}`,
        isSoon: this.isExamSoon(exam.startDate)
      }))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  /**
   * تبدیل تاریخ میلادی به شمسی (جلالی)
   */
  private convertToJalaali(dateString: string): string {
    try {
      const date = new Date(dateString);
      const j = jalaali.toJalaali(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      );
      
      // تبدیل اعداد انگلیسی به فارسی
      const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
      const year = j.jy.toString().replace(/\d/g, d => persianDigits[parseInt(d)]);
      const month = j.jm.toString().padStart(2, '۰').replace(/\d/g, d => persianDigits[parseInt(d)]);
      const day = j.jd.toString().padStart(2, '۰').replace(/\d/g, d => persianDigits[parseInt(d)]);
      
      return `${year}/${month}/${day}`;
    } catch {
      return dateString;
    }
  }

  /**
   * دریافت روز هفته فارسی
   */
  private getPersianDay(dateString: string): string {
    try {
      const date = new Date(dateString);
      const day = date.getDay();
      const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
      return days[day] || '';
    } catch {
      return '';
    }
  }

  /**
   * قالب‌بندی زمان
   */
  private formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      
      // تبدیل اعداد انگلیسی به فارسی
      const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      const persianHours = hours.replace(/\d/g, d => persianDigits[parseInt(d)]);
      const persianMinutes = minutes.replace(/\d/g, d => persianDigits[parseInt(d)]);
      
      return `${persianHours}:${persianMinutes}`;
    } catch {
      return '';
    }
  }

  /**
   * بررسی آیا امتحان به زودی است
   */
  private isExamSoon(dateString: string): boolean {
    try {
      const examDate = new Date(dateString);
      const now = new Date();
      const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } catch {
      return false;
    }
  }

  /**
   * به‌روزرسانی صفحه‌بندی دانشجویان
   */
  private updateStudentPagination(): void {
    if (!this.sortedStudents || this.sortedStudents.length === 0) {
      this.paginatedStudents = [];
      this.totalPages = 1;
      return;
    }
    
    const startIndex = (this.currentPage - 1) * this.studentsPerPage;
    const endIndex = startIndex + this.studentsPerPage;
    this.paginatedStudents = this.sortedStudents.slice(startIndex, endIndex);
    
    this.totalPages = Math.ceil(this.sortedStudents.length / this.studentsPerPage);
  }

  /**
   * تغییر صفحه دانشجویان
   */
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.updateStudentPagination();
  }

  /**
   * بازگشت به داشبورد
   */
  goBack(): void {
    this.router.navigate(['/teacher-dashboard']);
  }

  /**
   * ناوبری به صفحه امتحان
   */
  goToExam(examId: number): void {
    this.router.navigate(['/exams', examId]);
  }

  /**
   * دریافت کلاس CSS برای وضعیت امتحان
   */
  getExamStatusClass(examDate: string): string {
    const now = new Date();
    const examStart = new Date(examDate);
    
    if (examStart > now) {
      const diffDays = Math.ceil((examStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 3 ? 'status-soon' : 'status-upcoming';
    }
    
    return 'status-past';
  }

  /**
   * دریافت متن وضعیت امتحان
   */
  getExamStatusText(examDate: string): string {
    const now = new Date();
    const examStart = new Date(examDate);
    
    if (examStart > now) {
      const diffDays = Math.ceil((examStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'امروز';
      if (diffDays === 1) return 'فردا';
      if (diffDays <= 7) return `${diffDays} روز دیگر`;
      return 'برنامه‌ریزی شده';
    }
    
    return 'گذشته';
  }
  
  /**
   * متدهای عمومی برای استفاده در HTML
   */
  public formatToPersianDatePublic(dateString: string): string {
    return this.convertToJalaali(dateString);
  }
  
  public formatTimePublic(dateString: string): string {
    return this.formatTime(dateString);
  }
  
  public isExamSoonPublic(dateString: string): boolean {
    return this.isExamSoon(dateString);
  }
  
  /**
   * تبدیل شماره دانشجویی به فارسی
   */
  public convertToPersianNumbers(text: string): string {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';//تبدیلم نکردی اشکالی نداره
    return text.replace(/\d/g, d => persianDigits[parseInt(d)]);
  }
}