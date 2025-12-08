import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import * as jalaali from 'jalaali-js';

// سرویس‌ها
import { AuthService } from '../services/auth.service';
import { CoursesService } from '../services/course.service';

// مدل‌ها
interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  teacherCode: string;
  phone?: string;
  courses?: Course[];
}

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  unitCount: number;
  students: Student[];
  exams: Exam[];
}

interface Student {
  id: string;
  name: string;
  studentCode: string;
}

interface Exam {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  room: {
    id: number;
    name: string;
    capacity: number;
  };
  courseId?: string;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
}

// مدل نمایش امتحان
interface UpcomingExamView {
  id: number;
  roomName: string;
  name: string;
  date: string; // تاریخ شمسی
  startTime: string;
  endTime: string;
  startMillis: number;
  weekColor: number; // 0, 1, 2
  courseName?: string;
  courseCode?: string;
  status?: string;
}

// مدل نمایش درس
interface CourseView {
  id: string;
  courseCode: string;
  courseName: string;
  studentCount: number;
  examCount: number;
  unitCount: number;
}

interface TodayOverviewItem {
  id: number;
  title: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css']
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  // اطلاعات استاد
  teacher: Teacher | null = null;
  
  // وضعیت‌های بارگذاری
  loading = true;
  loadingCourses = false;
  loadingExams = false;
  
  // پیام‌های خطا
  errorMessage = '';
  courseErrorMessage = '';
  examErrorMessage = '';
  
  // تاریخ و تقویم - استفاده از jalaali
  todayJalaali = jalaali.toJalaali(new Date());
  currentYear: number;
  currentMonth: number;
  monthName = '';
  daysOfWeek = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  calendarGrid: (number | null)[] = [];
  
  // امتحان‌ها
  upcomingExams: UpcomingExamView[] = [];
  visibleExams: UpcomingExamView[] = [];
  showAllExams = false;
  maxVisibleExams = 5;
  
  // درس‌ها
  myCourses: CourseView[] = [];
  
  // مرور امروز
  todayOverview: TodayOverviewItem[] = [];
  
  // ویرایش پروفایل
  editDialogVisible = false;
  editModel = {
    firstName: '',
    lastName: '',
    email: '',
    teacherCode: '',
    phone: ''
  };
  
  // API endpoint برای امتحان‌ها
  examsApi = 'https://cheap-tones-intensive-wives.trycloudflare.com/api/exams';
  
  // مدیریت unsubscribe
  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private coursesService: CoursesService,
    private http: HttpClient,
    private router: Router
  ) {
    // مقداردهی اولیه سال و ماه جاری
    this.currentYear = this.todayJalaali.jy;
    this.currentMonth = this.todayJalaali.jm;
  }

  ngOnInit(): void {
    this.initDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * مقداردهی اولیه داشبورد
   */
  private initDashboard(): void {
    this.setupTodayOverview();
    this.generateCalendar();
    this.loadTeacherData();
  }

  /**
   * تنظیم مرور امروز
   */
  private setupTodayOverview(): void {
    this.todayOverview = [
      {
        id: 1,
        title: 'بررسی تکالیف ارسالی',
        icon: '📝',
        color: 'blue'
      },
      {
        id: 2,
        title: 'پاسخ به سوالات دانشجویان',
        icon: '💬',
        color: 'purple'
      },
      {
        id: 3,
        title: 'آماده‌سازی مطالب جلسه بعد',
        icon: '📚',
        color: 'green'
      },
      {
        id: 4,
        title: 'بررسی نمرات آخرین امتحان',
        icon: '📊',
        color: 'orange'
      }
    ];
  }

  /**
   * بارگذاری اطلاعات استاد
   */
  private loadTeacherData(): void {
    this.loading = true;
    
    this.auth.getTeacherDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.teacher = data;
          this.setupTeacherData();
          this.loadCourses();
          this.loadExamsFromApi();
          this.loading = false;
        },
        error: (err: any) => {
          console.error('خطا در دریافت اطلاعات استاد:', err);
          this.errorMessage = 'خطا در بارگذاری اطلاعات پروفایل';
          this.loading = false;
        }
      });
  }

  /**
   * تنظیم داده‌های استاد
   */
  private setupTeacherData(): void {
    if (!this.teacher) return;
    
    // تنظیم مدل ویرایش
    this.editModel = {
      firstName: this.teacher.firstName,
      lastName: this.teacher.lastName,
      email: this.teacher.email,
      teacherCode: this.teacher.teacherCode,
      phone: this.teacher.phone || ''
    };
    
    // به‌روزرسانی مرور امروز با داده‌های واقعی
    this.updateTodayOverviewWithRealData();
  }

  /**
   * به‌روزرسانی مرور امروز با داده‌های واقعی
   */
  private updateTodayOverviewWithRealData(): void {
    if (!this.teacher?.courses) return;
    
    const totalStudents = this.getTotalStudents();
    const activeExams = this.getActiveExams();
    
    this.todayOverview = [
      {
        id: 1,
        title: `${activeExams} امتحان فعال`,
        icon: '📝',
        color: 'blue'
      },
      {
        id: 2,
        title: `${totalStudents} دانشجو`,
        icon: '👥',
        color: 'purple'
      },
      {
        id: 3,
        title: `${this.teacher.courses.length} درس`,
        icon: '📚',
        color: 'green'
      },
      {
        id: 4,
        title: 'بررسی پیام‌های جدید',
        icon: '💬',
        color: 'orange'
      }
    ];
  }

  /**
   * بارگذاری درس‌ها
   */
  private loadCourses(): void {
    if (!this.teacher?.courses) {
      this.loadCoursesFromService();
      return;
    }
    
    this.loadingCourses = true;
    
    // استفاده از داده‌های teacher
    this.myCourses = this.teacher.courses.map(course => ({
      id: course.id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      studentCount: course.students?.length || 0,
      examCount: course.exams?.length || 0,
      unitCount: course.unitCount || 3
    }));
    
    this.loadingCourses = false;
  }

  /**
   * بارگذاری درس‌ها از سرویس
   */
  private loadCoursesFromService(): void {
    this.loadingCourses = true;
    
    this.coursesService.getMyCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses: any) => {
          this.myCourses = (courses || []).map((course: any) => ({
            id: course.id,
            courseCode: course.courseCode,
            courseName: course.courseName,
            studentCount: course.students?.length || course.studentCount || 0,
            examCount: course.exams?.length || course.examCount || 0,
            unitCount: course.unitCount || 3
          }));
          this.loadingCourses = false;
        },
        error: (err: any) => {
          console.error('خطا در دریافت درس‌ها:', err);
          this.courseErrorMessage = 'خطا در بارگذاری درس‌ها';
          this.loadingCourses = false;
        }
      });
  }

  /**
   * بارگذاری امتحان‌ها از API
   */
  private loadExamsFromApi(): void {
    this.loadingExams = true;
    
    this.http.get<Exam[]>(this.examsApi)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exams) => {
          this.upcomingExams = exams
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .map(e => this.mapExamDtoToView(e));
          
          this.updateVisibleExams();
          this.loadingExams = false;
        },
        error: (err: any) => {
          console.error('❌ خطا در دریافت امتحان‌ها:', err);
          this.examErrorMessage = 'خطا در بارگذاری امتحان‌ها';
          
          // اگر API خطا داد، از داده‌های local استفاده کن
          this.loadExamsFromLocalData();
          this.loadingExams = false;
        }
      });
  }

  /**
   * بارگذاری امتحان‌ها از داده‌های محلی
   */
  private loadExamsFromLocalData(): void {
    if (!this.teacher?.courses) {
      this.upcomingExams = [];
      this.updateVisibleExams();
      return;
    }
    
    this.upcomingExams = [];
    
    this.teacher.courses.forEach(course => {
      if (course.exams && course.exams.length > 0) {
        course.exams.forEach(exam => {
          this.upcomingExams.push(this.mapExamToView(exam, course));
        });
      }
    });
    
    // مرتب‌سازی بر اساس تاریخ
    this.upcomingExams.sort((a, b) => a.startMillis - b.startMillis);
    this.updateVisibleExams();
  }

  /**
   * تبدیل DTO امتحان به مدل نمایش
   */
  private mapExamDtoToView(dto: Exam): UpcomingExamView {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    
    // تبدیل به تاریخ شمسی
    const j = jalaali.toJalaali(start.getFullYear(), start.getMonth() + 1, start.getDate());
    const pad = (n: number) => String(n).padStart(2, '0');
    
    // محاسبه رنگ هفته بر اساس روز ماه شمسی
    const weekNumber = Math.floor((j.jd - 1) / 7);
    const weekColor = weekNumber % 3; // 0, 1, 2
    
    // یافتن نام درس مرتبط (اگر courseId موجود باشد)
    let courseName = '';
    let courseCode = '';
    if (dto.courseId && this.teacher?.courses) {
      const course = this.teacher.courses.find(c => c.id === dto.courseId);
      if (course) {
        courseName = course.courseName;
        courseCode = course.courseCode;
      }
    }
    
    return {
      id: dto.id,
      roomName: dto.room?.name?.trim() || 'تعیین نشده',
      name: dto.name,
      date: `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`,
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      startMillis: start.getTime(),
      weekColor,
      courseName,
      courseCode,
      status: dto.status || 'pending'
    };
  }

  /**
   * تبدیل Exam داخلی به مدل نمایش
   */
  private mapExamToView(exam: any, course: Course): UpcomingExamView {
    const start = new Date(exam.startDate);
    
    // تبدیل به تاریخ شمسی
    const j = jalaali.toJalaali(start.getFullYear(), start.getMonth() + 1, start.getDate());
    const pad = (n: number) => String(n).padStart(2, '0');
    
    // محاسبه رنگ هفته
    const weekNumber = Math.floor((j.jd - 1) / 7);
    const weekColor = weekNumber % 3;
    
    const end = exam.endDate ? new Date(exam.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    
    return {
      id: exam.id || Math.random(),
      roomName: exam.roomName || exam.room?.name || 'تعیین نشده',
      name: exam.name,
      date: `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`,
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      startMillis: start.getTime(),
      weekColor,
      courseName: course.courseName,
      courseCode: course.courseCode,
      status: exam.status || 'pending'
    };
  }

  /**
   * به‌روزرسانی امتحان‌های قابل نمایش
   */
  private updateVisibleExams(): void {
    this.visibleExams = this.showAllExams 
      ? this.upcomingExams 
      : this.upcomingExams.slice(0, this.maxVisibleExams);
  }

  /**
   * تولید تقویم شمسی
   */
  generateCalendar(): void {
    this.calendarGrid = [];
    this.monthName = this.getPersianMonthName(this.currentMonth);
    
    const daysInMonth = jalaali.jalaaliMonthLength(this.currentYear, this.currentMonth);
    const firstDayGregorian = jalaali.toGregorian(this.currentYear, this.currentMonth, 1);
    
    const firstDayDate = new Date(
      firstDayGregorian.gy,
      firstDayGregorian.gm - 1,
      firstDayGregorian.gd
    );
    
    // روز هفته در سیستم جلالی: شنبه = 0
    const firstDayOfWeek = (firstDayDate.getDay() + 1) % 7;
    
    // اضافه کردن روزهای خالی قبل از ماه
    for (let i = 0; i < firstDayOfWeek; i++) {
      this.calendarGrid.push(null);
    }
    
    // اضافه کردن روزهای ماه
    for (let day = 1; day <= daysInMonth; day++) {
      this.calendarGrid.push(day);
    }
  }

  /**
   * دریافت نام ماه فارسی
   */
  private getPersianMonthName(month: number): string {
    const monthNames = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    return monthNames[month - 1] || '';
  }

  /**
   * بررسی آیا روز امروز است
   */
  isToday(day: number | null): boolean {
    return (
      day === this.todayJalaali.jd &&
      this.currentMonth === this.todayJalaali.jm &&
      this.currentYear === this.todayJalaali.jy
    );
  }

  /**
   * تغییر ماه در تقویم
   */
  prevMonth(): void {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  prevYear(): void {
    this.currentYear--;
    this.generateCalendar();
  }

  nextYear(): void {
    this.currentYear++;
    this.generateCalendar();
  }

  /**
   * دریافت تعداد کل دانشجویان
   */
  getTotalStudents(): number {
    if (!this.teacher?.courses) return 0;
    return this.teacher.courses.reduce((total, course) => 
      total + (course.students?.length || 0), 0
    );
  }

  /**
   * دریافت تعداد امتحان‌های فعال
   */
  getActiveExams(): number {
    if (!this.teacher?.courses) return 0;
    return this.teacher.courses.reduce((total, course) => 
      total + (course.exams?.filter(e => e.status === 'active').length || 0), 0
    );
  }

  /**
   * دریافت کلاس CSS برای رنگ هفته
   */
  getWeekCssClass(weekColor: number): string {
    return `week-color-${weekColor}`;
  }

  /**
   * بررسی آیا امتحان گذشته است
   */
  isExamPast(exam: UpcomingExamView): boolean {
    return exam.startMillis < Date.now();
  }

  /**
   * تغییر وضعیت نمایش امتحان‌ها
   */
  toggleShowMore(): void {
    this.showAllExams = !this.showAllExams;
    this.updateVisibleExams();
  }

  /**
   * باز کردن دیالوگ ویرایش
   */
  openEditDialog(): void {
    if (!this.teacher) return;
    
    this.editModel = {
      firstName: this.teacher.firstName,
      lastName: this.teacher.lastName,
      email: this.teacher.email,
      teacherCode: this.teacher.teacherCode,
      phone: this.teacher.phone || ''
    };
    
    this.editDialogVisible = true;
  }

  /**
   * ذخیره تغییرات ویرایش
   */
  saveChanges(): void {
    if (!this.teacher) return;
    
    // در حالت واقعی، اینجا درخواست API به سرور می‌زنیم
    this.teacher.firstName = this.editModel.firstName;
    this.teacher.lastName = this.editModel.lastName;
    this.teacher.email = this.editModel.email;
    this.teacher.teacherCode = this.editModel.teacherCode;
    this.teacher.phone = this.editModel.phone;
    
    console.log('تغییرات با موفقیت ذخیره شد');
    
    this.editDialogVisible = false;
  }

  /**
   * لغو ویرایش
   */
  cancelEdit(): void {
    this.editDialogVisible = false;
  }

  /**
   * خروج از سیستم - بر اساس AuthService
   */
  logout(): void {
    // استفاده از متد logout در AuthService
    this.auth.logout();
    // AuthService خودش ناوبری انجام میده (window.location.href = '/login')
  }

  /**
   * دریافت آواتار استاد
   */
  getTeacherAvatar(): string {
    if (!this.teacher) return '??';
    return `${this.teacher.firstName[0]}${this.teacher.lastName[0]}`.toUpperCase();
  }

  /**
   * دریافت نام روز فارسی برای تاریخ
   */
  getPersianDay(dateString: string): string {
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
   * ناوبری به صفحه درس
   */
  navigateToCourse(courseId: string): void {
    this.router.navigate(['/courses', courseId]);
  }

  /**
   * ناوبری به صفحه امتحان
   */
  navigateToExam(examId: number): void {
    this.router.navigate(['/exams', examId]);
  }
}