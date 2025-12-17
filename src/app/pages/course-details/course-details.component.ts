import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import * as jalaali from 'jalaali-js';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';  // اضافه شد

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

interface SurveyResult {
  [key: string]: number;
}

interface Survey {
  id: number;
  title: string;
  options: string[];
  resultsPercentage: SurveyResult;
  resultsCount: SurveyResult;
  totalVotes: number;
  userVote?: number; // ایندکس گزینه‌ای که کاربر انتخاب کرده
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
  surveys: Survey[];
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
    // اضافه کردن یک متغیر برای وضعیت لاگین
  isUserLoggedIn = false;
  userRole: 'teacher' | 'student' | null = null;
  
  // برای ذخیره‌سازی آرای کاربر
  userVotes: { [surveyId: number]: number } = {};
  
  // برای ذخیره‌سازی خطاهای هر نظرسنجی
  surveyErrors: { [surveyId: number]: string } = {};
  
  // داده‌های آماری
  stats = {
    totalStudents: 0,
    totalExams: 0,
    todayExams: 0,
    upcomingExams: 0,
    totalSurveys: 0,
    activeSurveys: 0
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
    private http: HttpClient,
    private tokenService: TokenService,  // اضافه شد
    private authService: AuthService  // اضافه شد
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    
    if (!this.courseId) {
      this.errorMessage = 'شناسه درس نامعتبر است';
      this.loading = false;
      return;
    }
    // چک کردن وضعیت لاگین کاربر
    this.checkUserLoginStatus();
    // بارگذاری اطلاعات درس (بدون توکن)
    this.loadCourseDetails();
    
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

   /**
   * چک کردن وضعیت لاگین کاربر
   */
  private checkUserLoginStatus(): void {
    this.isUserLoggedIn = this.authService.isLoggedIn();
    this.userRole = this.authService.getUserRole();
    
    console.log('👤 وضعیت کاربر:', {
      loggedIn: this.isUserLoggedIn,
      role: this.userRole,
      hasToken: !!this.authService.getToken()
    });
  }

  
  /**
   * بارگذاری جزئیات درس (بدون نیاز به توکن)
   */
  private loadCourseDetails(): void {
    this.loading = true;
    
    // این درخواست عمومی است، نیازی به توکن ندارد
    this.http.get<CourseDetails>(`http://localhost:8081/api/courses/${this.courseId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.course = data;
          this.sortStudentsByLastName();
          this.calculateStats();
          this.prepareUpcomingExams();
          this.updateStudentPagination();
          
          // اگر نظرسنجی داریم و کاربر لاگین کرده، آرای کاربر را چک کنیم
          if (this.course.surveys && this.isUserLoggedIn) {
            this.loadUserVotes();
          }
          
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

    // محاسبه نظرسنجی‌های فعال (با رأی دهنده)
    const activeSurveys = this.course.surveys?.filter(survey => 
      survey.totalVotes > 0
    ) || [];

    this.stats = {
      totalStudents: this.sortedStudents.length,
      totalExams: this.course.exams.length,
      todayExams: this.course.exams.filter(exam => {
        const nowDate = new Date();
        nowDate.setHours(0, 0, 0, 0);

        const start = new Date(exam.startDate);
        const end = new Date(exam.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return nowDate >= start && nowDate <= end;
      }).length,
      upcomingExams: upcomingExams.length,
      totalSurveys: this.course.surveys?.length || 0,
      activeSurveys: activeSurveys.length
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
   * رأی دادن به یک گزینه نظرسنجی
   */
  voteForOption(surveyId: number, optionIndex: number): void {
    console.log('🟡 تلاش برای رأی دادن:', surveyId, optionIndex);
    
    // حذف خطای قبلی
    delete this.surveyErrors[surveyId];
    
    // 1. چک کردن آیا کاربر لاگین کرده
    if (!this.isUserLoggedIn) {
      this.surveyErrors[surveyId] = 'برای رأی دادن باید وارد حساب کاربری شوید.';
      // هدایت به صفحه لاگین
      this.router.navigate(['/login']);
      return;
    }
    
    // 2. چک کردن آیا کاربر دانشجو است
    if (this.userRole !== 'student') {
      this.surveyErrors[surveyId] = 'فقط دانشجویان می‌توانند رأی دهند.';
      return;
    }
    
    // 3. اگر کاربر قبلاً رأی داده
    if (this.hasUserVoted(surveyId)) {
      this.surveyErrors[surveyId] = 'شما قبلاً به این نظرسنجی رأی داده‌اید.';
      return;
    }
    
    // 4. دریافت توکن
    const token = this.authService.getToken();
    if (!token) {
      this.surveyErrors[surveyId] = 'خطا در احراز هویت. لطفاً مجدداً وارد شوید.';
      return;
    }
    
    // 5. ارسال درخواست رأی با توکن
    this.http.post(
      `http://localhost:8081/api/surveys/${surveyId}/vote?optionIndex=${optionIndex}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ رأی با موفقیت ثبت شد:', response);
          
          // ذخیره رأی کاربر
          this.userVotes[surveyId] = optionIndex;
          
          // به‌روزرسانی آمار این نظرسنجی
          this.refreshSingleSurveyStats(surveyId);
        },
        error: (err) => {
          console.error('❌ خطا در ثبت رأی:', err);
          
          if (err.status === 401 || err.status === 403) {
            this.surveyErrors[surveyId] = 'احراز هویت ناموفق. لطفاً مجدداً وارد شوید.';
            this.authService.logout();
          } else if (err.status === 400) {
            this.surveyErrors[surveyId] = err.error?.error || 'خطا در ثبت رأی';
          } else {
            this.surveyErrors[surveyId] = 'خطا در ثبت رأی. لطفاً دوباره تلاش کنید.';
          }
        }
      });
  }

  

  /**
   * بارگذاری آرای کاربر برای نظرسنجی‌ها
   */
  private loadUserVotes(): void {
    // اگر کاربر دانشجو است و لاگین کرده
    if (this.userRole === 'student') {
      this.course!.surveys.forEach(survey => {
        // API برای دریافت رأی کاربر برای این نظرسنجی
        const token = this.authService.getToken();
        if (token) {
          this.http.get<any>(`http://localhost:8081/api/surveys/${survey.id}/my-vote`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.userVote !== undefined) {
                  this.userVotes[survey.id] = response.userVote;
                }
              },
              error: (err) => {
                console.log(`نظرسنجی ${survey.id}: کاربر رأی نداده`);
              }
            });
        }
         });
    }
  }
  
  /**
   * به‌روزرسانی آمار یک نظرسنجی خاص
   */
  private refreshSingleSurveyStats(surveyId: number): void {
    if (!this.course) return;
    
    // این درخواست عمومی است (نیازی به توکن ندارد)
    this.http.get<Survey>(`http://localhost:8081/api/surveys/${surveyId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedSurvey) => {
          const index = this.course!.surveys.findIndex(s => s.id === surveyId);
          if (index !== -1) {
            this.course!.surveys[index] = updatedSurvey;
          }
        },
        error: (err) => {
          console.error('خطا در دریافت آمار به‌روز:', err);
        }
      });
  }
  // بعد از constructor یا در کلاس
  goToLogin(): void {
    this.router.navigate(['/login']);
  }



  /**
   * لغو رأی کاربر
   */
  cancelVote(surveyId: number): void {
    // حذف خطای قبلی
    delete this.surveyErrors[surveyId];
    
    // درخواست لغو رأی به سرور (این متد باید در سرور پیاده‌سازی شود)
    // برای سادگی، می‌توانیم فقط رأی را از حافظه محلی پاک کنیم
    // یا یک درخواست DELETE به سرور بفرستیم
    
    // در این مثال، فقط از حافظه محلی پاک می‌کنیم
    delete this.userVotes[surveyId];
    
    // به‌روزرسانی آمار نظرسنجی
    this.refreshSurveyStats(surveyId);
    
    console.log('🗑️ رأی کاربر لغو شد:', surveyId);
  }

  /**
   * به‌روزرسانی آمار نظرسنجی
   */
  private refreshSurveyStats(surveyId: number): void {
    if (!this.course) return;
    
    // دریافت اطلاعات به‌روزرسانی شده نظرسنجی از سرور
    this.http.get<Survey>(`http://localhost:8081/api/surveys/${surveyId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedSurvey) => {
          // به‌روزرسانی نظرسنجی در لیست
          const index = this.course!.surveys.findIndex(s => s.id === surveyId);
          if (index !== -1) {
            this.course!.surveys[index] = updatedSurvey;
          }
        },
        error: (err) => {
          console.error('❌ خطا در دریافت اطلاعات به‌روزرسانی شده نظرسنجی:', err);
        }
      });
  }

  /**
   * بررسی آیا کاربر به این نظرسنجی رأی داده است
   */
  hasUserVoted(surveyId: number): boolean {
    return this.userVotes[surveyId] !== undefined;
  }

  /**
   * بررسی آیا گزینه خاصی انتخاب شده است
   */
  isOptionSelected(surveyId: number, optionIndex: number): boolean {
    return this.userVotes[surveyId] === optionIndex;
  }

  /**
   * دریافت خطای نظرسنجی
   */
  getSurveyError(surveyId: number): string {
    return this.surveyErrors[surveyId] || '';
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
   * دریافت درصد رأی برای یک گزینه نظرسنجی
   */
  getSurveyOptionPercentage(survey: Survey, option: string): number {
    return survey.resultsPercentage[option] || 0;
  }

  /**
   * دریافت تعداد رأی برای یک گزینه نظرسنجی
   */
  getSurveyOptionCount(survey: Survey, option: string): number {
    return survey.resultsCount[option] || 0;
  }

  /**
   * بررسی آیا نظرسنجی فعال است
   */
  isSurveyActive(survey: Survey): boolean {
    return survey.totalVotes > 0 && Object.keys(survey.resultsCount).length > 0;
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
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    return text.replace(/\d/g, d => persianDigits[parseInt(d)]);
  }
  
  /**
   * ناوبری به صفحه رزرو امتحان
   */
  navigateToExamReservation(): void {
    if (this.courseId) {
      this.router.navigate(['/course', this.courseId, 'new-exam']);
    }
  }
}