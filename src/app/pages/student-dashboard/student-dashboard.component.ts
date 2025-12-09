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
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  email?: string;
  username: string;
  phone?: string;
  courses?: Course[];
}

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  unitCount?: number;
  students: Student[];
  exams: Exam[];
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  dayOfWeek?: string;
  roomC?: string;
  timeC?: string;
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
  courseName?: string;
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
  courseName: string;
  courseCode: string;
  teacherName: string;
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
  teacherName: string;
  dayOfWeek?: string;
  roomC?: string;
  timeC?: string;
}

interface TodayOverviewItem {
  id: number;
  title: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css'] // استفاده از CSS مشابه
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  // اطلاعات دانشجو
  student: Student | null = null;
  
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
    studentNumber: '',
    phone: ''
  };
  
  // API endpoint برای امتحان‌ها
  examsApi = 'http://localhost:8081i/api/exams';
  
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
    this.loadStudentData();
  }

  /**
   * تنظیم مرور امروز برای دانشجو
   */
  private setupTodayOverview(): void {
    this.todayOverview = [
      {
        id: 1,
        title: 'تکالیف امروز',
        icon: '📝',
        color: 'blue'
      },
      {
        id: 2,
        title: 'جلسات کلاسی',
        icon: '🎓',
        color: 'purple'
      },
      {
        id: 3,
        title: 'آمادگی برای امتحانات',
        icon: '📚',
        color: 'green'
      },
      {
        id: 4,
        title: 'بررسی نمرات',
        icon: '📊',
        color: 'orange'
      }
    ];
  }

  /**
   * بارگذاری اطلاعات دانشجو
   */
  private loadStudentData(): void {
    this.loading = true;
    
    this.auth.getStudentDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.student = data;
          this.setupStudentData();
          this.loadCourses();
          this.loadExamsFromApi();
          this.loading = false;
        },
        error: (err: any) => {
          console.error('خطا در دریافت اطلاعات دانشجو:', err);
          this.errorMessage = 'خطا در بارگذاری اطلاعات پروفایل';
          this.loading = false;
        }
      });
  }

  /**
   * تنظیم داده‌های دانشجو
   */
  private setupStudentData(): void {
    if (!this.student) return;
    
    // تنظیم مدل ویرایش
    this.editModel = {
      firstName: this.student.firstName,
      lastName: this.student.lastName,
      email: this.student.email || '',
      studentNumber: this.student.studentNumber,
      phone: this.student.phone || ''
    };
    
    // به‌روزرسانی مرور امروز با داده‌های واقعی
    this.updateTodayOverviewWithRealData();
  }

  /**
   * به‌روزرسانی مرور امروز با داده‌های واقعی
   */
  private updateTodayOverviewWithRealData(): void {
    if (!this.student?.courses) return;
    
    const totalCourses = this.student.courses.length;
    const upcomingExams = this.getUpcomingExamsCount();
    const todayClasses = this.getTodayClassesCount();
    
    this.todayOverview = [
      {
        id: 1,
        title: `${todayClasses} کلاس امروز`,
        icon: '🎓',
        color: 'blue'
      },
      {
        id: 2,
        title: `${upcomingExams} امتحان پیش‌رو`,
        icon: '📝',
        color: 'purple'
      },
      {
        id: 3,
        title: `${totalCourses} درس`,
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
    if (!this.student?.courses) {
      this.loadCoursesFromService();
      return;
    }
    
    this.loadingCourses = true;
    
    // استفاده از داده‌های student
    this.myCourses = this.student.courses.map(course => ({
      id: course.id.toString(),
      courseCode: course.courseCode,
      courseName: course.courseName,
      studentCount: course.students?.length || 0,
      examCount: course.exams?.length || 0,
      unitCount: course.unitCount || 3,
      teacherName: `${course.teacher?.firstName || ''} ${course.teacher?.lastName || ''}`.trim(),
      dayOfWeek: course.dayOfWeek || 'تعیین نشده',
      roomC: course.roomC || 'تعیین نشده',
      timeC: course.timeC || 'تعیین نشده'
    }));
    
    this.loadingCourses = false;
  }

  /**
   * بارگذاری درس‌ها از سرویس
   */
  private loadCoursesFromService(): void {
    this.loadingCourses = true;
    
    this.coursesService.getStudentCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses: any) => {
          this.myCourses = (courses || []).map((course: any) => ({
            id: course.id.toString(),
            courseCode: course.courseCode,
            courseName: course.courseName,
            studentCount: course.students?.length || 0,
            examCount: course.exams?.length || 0,
            unitCount: course.unitCount || 3,
            teacherName: `${course.teacher?.firstName || ''} ${course.teacher?.lastName || ''}`.trim(),
            dayOfWeek: course.dayOfWeek || 'تعیین نشده',
            roomC: course.roomC || 'تعیین نشده',
            timeC: course.timeC || 'تعیین نشده'
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
    if (!this.student?.courses) {
      this.upcomingExams = [];
      this.updateVisibleExams();
      return;
    }
    
    this.upcomingExams = [];
    
    this.student.courses.forEach(course => {
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
    
    // یافتن نام درس مرتبط
    let courseName = dto.courseName || '';
    let courseCode = '';
    let teacherName = '';
    
    if (dto.courseId && this.student?.courses) {
      const course = this.student.courses.find(c => c.id.toString() === dto.courseId);
      if (course) {
        courseName = course.courseName;
        courseCode = course.courseCode;
        teacherName = `${course.teacher?.firstName || ''} ${course.teacher?.lastName || ''}`.trim();
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
      teacherName,
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
      teacherName: `${course.teacher?.firstName || ''} ${course.teacher?.lastName || ''}`.trim(),
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
   * دریافت تعداد کلاس‌های امروز
   */
  getTodayClassesCount(): number {
    if (!this.student?.courses) return 0;
    
    const today = new Date();
    const todayDayOfWeek = this.daysOfWeek[today.getDay()];
    
    return this.student.courses.filter(course => 
      course.dayOfWeek === todayDayOfWeek
    ).length;
  }

  /**
   * دریافت تعداد امتحان‌های پیش‌رو
   */
  getUpcomingExamsCount(): number {
    if (!this.student?.courses) return 0;
    
    let count = 0;
    this.student.courses.forEach(course => {
      if (course.exams) {
        const now = new Date().getTime();
        count += course.exams.filter(exam => {
          const examDate = new Date(exam.startDate).getTime();
          return examDate > now;
        }).length;
      }
    });
    return count;
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
    if (!this.student) return;
    
    this.editModel = {
      firstName: this.student.firstName,
      lastName: this.student.lastName,
      email: this.student.email || '',
      studentNumber: this.student.studentNumber,
      phone: this.student.phone || ''
    };
    
    this.editDialogVisible = true;
  }

  /**
   * ذخیره تغییرات ویرایش
   */
  saveChanges(): void {
    if (!this.student) return;
    
    // در حالت واقعی، اینجا درخواست API به سرور می‌زنیم
    this.student.firstName = this.editModel.firstName;
    this.student.lastName = this.editModel.lastName;
    this.student.email = this.editModel.email;
    this.student.studentNumber = this.editModel.studentNumber;
    this.student.phone = this.editModel.phone;
    
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
  }

  /**
   * دریافت آواتار دانشجو
   */
  getStudentAvatar(): string {
    if (!this.student) return '??';
    return `${this.student.firstName[0]}${this.student.lastName[0]}`.toUpperCase();
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

  /**
   * دریافت نام استاد درس
   */
  getTeacherName(course: CourseView): string {
    return course.teacherName || 'استاد تعیین نشده';
  }
}