import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './create-survey.component.html',
  styleUrls: ['./create-survey.component.css']
})
export class CreateSurveyComponent {
  courseId: string | null = null;
  
  // تغییر ساختار داده‌ها - استفاده از آرایه‌ای از آبجکت‌ها
  surveyData = {
    title: '',
    options: [
      { id: 1, text: '' },
      { id: 2, text: '' }
    ]
  };
  
  loading = false;
  errorMessage = '';
  successMessage = '';
  isSubmitted = false;
  
  private destroy$ = new Subject<void>();
  private optionIdCounter = 3; // شمارنده برای ID گزینه‌ها

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId');
    
    if (!this.courseId) {
      this.errorMessage = 'شناسه درس نامعتبر است';
      setTimeout(() => this.goBack(), 2000);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // اضافه کردن گزینه جدید
  addOption(): void {
    this.surveyData.options.push({
      id: this.optionIdCounter++,
      text: ''
    });
  }

  // حذف یک گزینه
  removeOption(index: number): void {
    if (this.surveyData.options.length > 2) {
      this.surveyData.options.splice(index, 1);
    }
  }

  // تابع trackBy برای رندر بهینه
  trackByOptionId(index: number, option: any): number {
    return option.id;
  }

  // بررسی اعتبار فرم
  validateForm(): boolean {
    this.errorMessage = '';
    
    // بررسی عنوان
    const title = this.surveyData.title.trim();
    if (!title) {
      this.errorMessage = 'عنوان نظرسنجی را وارد کنید';
      return false;
    }

    if (title.length < 5) {
      this.errorMessage = 'عنوان نظرسنجی باید حداقل ۵ حرف باشد';
      return false;
    }

    // بررسی گزینه‌ها
    const optionTexts = this.surveyData.options
      .map(option => option.text.trim())
      .filter(text => text !== '');
      
    if (optionTexts.length < 2) {
      this.errorMessage = 'حداقل دو گزینه معتبر وارد کنید';
      return false;
    }

    // بررسی تکراری نبودن گزینه‌ها
    const uniqueOptions = [...new Set(optionTexts)];
    if (uniqueOptions.length !== optionTexts.length) {
      this.errorMessage = 'گزینه‌ها نباید تکراری باشند';
      return false;
    }

    // بررسی طول گزینه‌ها
    for (let i = 0; i < optionTexts.length; i++) {
      if (optionTexts[i].length < 2) {
        this.errorMessage = `گزینه ${i + 1} باید حداقل ۲ حرف باشد`;
        return false;
      }
      
      if (optionTexts[i].length > 100) {
        this.errorMessage = `گزینه ${i + 1} نباید بیشتر از ۱۰۰ حرف باشد`;
        return false;
      }
    }

    return true;
  }

  // ارسال نظرسنجی
  submitSurvey(): void {
    if (this.isSubmitted) return;
    
    if (!this.validateForm()) {
      return;
    }

    if (!this.courseId) {
      this.errorMessage = 'شناسه درس نامعتبر است';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitted = true;

    // آماده‌سازی داده‌ها برای ارسال
    const payload = {
      title: this.surveyData.title.trim(),
      options: this.surveyData.options
        .map(option => option.text.trim())
        .filter(text => text !== '')
    };

    console.log('📤 ارسال نظرسنجی:', payload);

    this.http.post(
      `http://localhost:8081/api/surveys/create?courseId=${this.courseId}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          this.successMessage = '✅ نظرسنجی با موفقیت ایجاد شد';
          
          console.log('✅ پاسخ سرور:', response);
          
          // پس از 1.5 ثانیه بازگشت به صفحه درس
          setTimeout(() => {
            this.router.navigate(['/courses', this.courseId]);
          }, 1500);
        },
        error: (err) => {
          this.loading = false;
          this.isSubmitted = false;
          console.error('❌ خطا در ایجاد نظرسنجی:', err);
          
          if (err.status === 401 || err.status === 403) {
            this.errorMessage = '🔒 دسترسی غیرمجاز. لطفاً وارد شوید.';
          } else if (err.status === 400) {
            this.errorMessage = '❌ ' + (err.error?.error || 'داده‌های وارد شده نامعتبر است');
          } else if (err.status === 404) {
            this.errorMessage = '❌ درس مورد نظر یافت نشد';
          } else if (err.status === 0) {
            this.errorMessage = '🔌 خطای اتصال: سرور در دسترس نیست';
          } else {
            this.errorMessage = '❌ خطا در ایجاد نظرسنجی. لطفاً دوباره تلاش کنید.';
          }
        }
      });
  }

  // بازگشت
  goBack(): void {
    this.router.navigate(['/courses', this.courseId]);
  }

  // تبدیل اعداد فارسی
  convertToPersianNumbers(text: string): string {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    return text.replace(/\d/g, d => persianDigits[parseInt(d)]);
  }
}