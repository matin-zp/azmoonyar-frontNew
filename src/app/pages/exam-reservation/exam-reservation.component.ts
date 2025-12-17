import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import * as jalaali from 'jalaali-js';

interface Exam {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  room: {
    id: number;
    name: string;
    capacity: number;
  };
}

interface Room {
  id: number;
  name: string;
  capacity: number;
}

interface ExamReservationRequest {
  name: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  course: string;
  room: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
  display: string;
  disabled: boolean;
}

// مدل جدید برای تحلیل تاریخ‌ها
interface DateAnalysis {
  date: string; // تاریخ میلادی به فرمت YYYY-MM-DD
  recommendationGroup: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  studentsOnDayPercent: number;
  studentsYesterdayPercent: number;
  studentsTomorrowPercent: number;
  friday: boolean;
}

// مدل برای نگهداری تحلیل تاریخ به صورت شمسی
interface JalaaliDateAnalysis {
  jalaaliDate: string; // تاریخ شمسی به فرمت YYYY/MM/DD
  recommendationGroup: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  studentsOnDayPercent: number;
  studentsYesterdayPercent: number;
  studentsTomorrowPercent: number;
  friday: boolean;
  gregorianDate: Date; // تاریخ میلادی برای مقایسه
}

interface CalendarDay {
  day: number | null;
  jalaaliDate: string;
  gregorianDate: Date | null;
  isToday: boolean;
  isSelected: boolean;
  dateAnalysis?: JalaaliDateAnalysis | null; // اضافه کردن این خط
}

interface RoomAvailability {
  room: Room;
  availability: TimeSlotAvailability[];
}

interface TimeSlotAvailability {
  time: string; // "08:00-10:00"
  startTime: string; // "08:00"
  endTime: string; // "10:00"
  isAvailable: boolean;
  examName?: string;
}


@Component({
  selector: 'app-exam-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './exam-reservation.component.html',
  styleUrls: ['./exam-reservation.component.css']
})
export class ExamReservationComponent implements OnInit, OnDestroy {
  // متغیرهای مسیر
  courseId: string = '';
  
  // تاریخ و تقویم
  todayJalaali = jalaali.toJalaali(new Date());
  currentYear: number;
  currentMonth: number;
  monthName = '';
  daysOfWeek = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  calendarGrid: CalendarDay[] = [];
  selectedDate: Date | null = null;
  selectedJalaaliDate: string = '';
  
  // سالن‌ها و زمان‌ها
  allRooms: Room[] = [];
  allExams: Exam[] = [];
  roomAvailabilities: RoomAvailability[] = [];
  
  // تحلیل تاریخ‌ها
  dateAnalyses: JalaaliDateAnalysis[] = [];
  loadingAnalysis = false;
  
  // زمان‌های انتخابی
  timeSlots: TimeSlot[] = [];
  selectedStartTime: string = '08:00';
  selectedEndTime: string = '10:00';
  selectedRoomId: string = '';
  
  // فرم رزرو
  examName: string = '';
  examNameError: string = '';
  
  // وضعیت‌های بارگذاری
  loading = true;
  loadingRooms = false;
  loadingExams = false;
  submitting = false;
  
  // پیام‌ها
  errorMessage = '';
  successMessage = '';
  
  // API endpoints
  examsApi = 'http://localhost:8081/api/exams';
  roomsApi = 'http://localhost:8081/api/rooms';
  dateAnalysisApi = 'http://localhost:8081/api/courses'; // پایه
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {
    this.currentYear = this.todayJalaali.jy;
    this.currentMonth = this.todayJalaali.jm;
  }

  ngOnInit(): void {
    this.initComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initComponent(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.courseId = params['courseId'] || '';
      this.loadData();
    });
    
    this.generateCalendar();
    this.generateTimeSlots();
    this.selectToday();
  }

  private loadData(): void {
    this.loading = true;
    
    // بارگذاری همزمان سالن‌ها، امتحان‌ها و تحلیل تاریخ‌ها
    Promise.all([
      this.loadRooms(),
      this.loadExams(),
      this.loadDateAnalysis()
    ]).then(() => {
      this.loading = false;
    }).catch(err => {
      console.error('خطا در بارگذاری داده‌ها:', err);
      this.errorMessage = 'خطا در بارگذاری اطلاعات سیستم';
      this.loading = false;
    });
  }

  private loadDateAnalysis(): Promise<void> {
    if (!this.courseId) {
      return Promise.resolve();
    }
    
    this.loadingAnalysis = true;
    return new Promise((resolve, reject) => {
      const url = `${this.dateAnalysisApi}/${this.courseId}/exam-date-analysis`;
      const timestamp = new Date().getTime();
      const fullUrl = `${url}?t=${timestamp}`;
      
      this.http.get<DateAnalysis[]>(fullUrl)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (analyses) => {
            console.log('📊 تحلیل تاریخ‌های دریافتی:', analyses);
            this.convertAnalysesToJalaali(analyses);
            this.loadingAnalysis = false;
            resolve();
          },
          error: (err) => {
            console.error('خطا در دریافت تحلیل تاریخ‌ها:', err);
            this.loadingAnalysis = false;
            // عدم موفقیت در دریافت تحلیل تاریخ‌ها نباید کل برنامه را متوقف کند
            resolve();
          }
        });
    });
  }

  /**
   * تبدیل تحلیل تاریخ‌های میلادی به شمسی
   */
  private convertAnalysesToJalaali(analyses: DateAnalysis[]): void {
    this.dateAnalyses = [];
    
    for (const analysis of analyses) {
      try {
        // تبدیل تاریخ میلادی به Date object
        const [year, month, day] = analysis.date.split('-').map(Number);
        const gregorianDate = new Date(year, month - 1, day);
        
        // تبدیل به تاریخ شمسی
        const jalaaliDate = jalaali.toJalaali(gregorianDate);
        const jalaaliDateStr = `${jalaaliDate.jy}/${this.pad(jalaaliDate.jm)}/${this.pad(jalaaliDate.jd)}`;
        
        // ایجاد مدل ترکیبی
        const jalaaliAnalysis: JalaaliDateAnalysis = {
          jalaaliDate: jalaaliDateStr,
          recommendationGroup: analysis.recommendationGroup,
          studentsOnDayPercent: analysis.studentsOnDayPercent,
          studentsYesterdayPercent: analysis.studentsYesterdayPercent,
          studentsTomorrowPercent: analysis.studentsTomorrowPercent,
          friday: analysis.friday,
          gregorianDate: gregorianDate
        };
        
        this.dateAnalyses.push(jalaaliAnalysis);
      } catch (error) {
        console.error('خطا در تبدیل تاریخ:', analysis.date, error);
      }
    }
    
    console.log('📊 تحلیل تاریخ‌های شمسی:', this.dateAnalyses);
  }

  /**
   * دریافت توصیه برای یک تاریخ خاص
   */
  getRecommendationForDate(date: Date): JalaaliDateAnalysis | null {
    if (!date || this.dateAnalyses.length === 0) {
      return null;
    }
    
    // تبدیل تاریخ به رشته YYYY-MM-DD برای مقایسه
    const dateStr = this.formatGregorianDate(date);
    
    // جستجوی تحلیل برای این تاریخ
    return this.dateAnalyses.find(analysis => {
      const analysisDateStr = this.formatGregorianDate(analysis.gregorianDate);
      return analysisDateStr === dateStr;
    }) || null;
  }

  /**
   * قالب‌بندی تاریخ میلادی به YYYY-MM-DD
   */
  private formatGregorianDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}-${this.pad(month)}-${this.pad(day)}`;
  }

  /**
   * دریافت کلاس CSS برای توصیه
   */
  getRecommendationClass(recommendation: string): string {
    switch (recommendation) {
      case 'EXCELLENT':
        return 'cal-excellent';
      case 'GOOD':
        return 'cal-good';
      case 'FAIR':
        return 'cal-fair';
      case 'POOR':
        return 'cal-poor';
      default:
        return '';
    }
  }

  /**
   * دریافت متن توصیه برای نمایش در tooltip
   */
  getRecommendationTooltip(analysis: JalaaliDateAnalysis | null | undefined): string {
    if (!analysis) {
      return 'بدون تحلیل';
    }
    
    const groupText = this.getRecommendationGroupText(analysis.recommendationGroup);
    const dayPercent = Math.round(analysis.studentsOnDayPercent);
    const yesterdayPercent = Math.round(analysis.studentsYesterdayPercent);
    const tomorrowPercent = Math.round(analysis.studentsTomorrowPercent);
    
    return `
      وضعیت: ${groupText}
      ${dayPercent}٪ از دانشجویان در این روز امتحان دیگری دارند
      ${yesterdayPercent}٪ از دانشجویان در روز قبل امتحان دیگری دارند
      ${tomorrowPercent}٪ از دانشجویان فردا امتحان دیگری دارند
      ${analysis.friday ? '' : ''}
    `.trim();
  }

  /**
   * دریافت متن فارسی برای گروه توصیه
   */
  private getRecommendationGroupText(group: string): string {
    switch (group) {
      case 'EXCELLENT':
        return 'عالی';
      case 'GOOD':
        return 'خوب';
      case 'FAIR':
        return 'متوسط';
      case 'POOR':
        return 'ضعیف';
      default:
        return group;
    }
  }

  private loadRooms(): Promise<void> {
    this.loadingRooms = true;
    return new Promise((resolve, reject) => {
      this.http.get<Room[]>(this.roomsApi)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (rooms) => {
            this.allRooms = rooms;
            this.initializeRoomAvailabilities();
            this.loadingRooms = false;
            resolve();
          },
          error: (err) => {
            console.error('خطا در دریافت سالن‌ها:', err);
            this.loadingRooms = false;
            reject(err);
          }
        });
    });
  }

  private loadExams(): Promise<void> {
  this.loadingExams = true;
  return new Promise((resolve, reject) => {
    // اضافه کردن timestamp برای جلوگیری از caching
    const timestamp = new Date().getTime();
    const url = `${this.examsApi}?t=${timestamp}`;
    
    this.http.get<Exam[]>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exams) => {
          console.log('📥 امتحان‌های دریافتی از سرور:', exams);
          this.allExams = exams;
          this.loadingExams = false;
          resolve();
        },
        error: (err) => {
          console.error('خطا در دریافت امتحان‌ها:', err);
          this.loadingExams = false;
          reject(err);
        }
      });
  });
}

private refreshExams(): void {
  console.log('🔄 بارگذاری مجدد امتحان‌ها...');
  
  // اضافه کردن timestamp برای جلوگیری از caching
  const timestamp = new Date().getTime();
  const url = `${this.examsApi}?t=${timestamp}`;
  
  this.http.get<Exam[]>(url)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (exams) => {
        console.log('✅ امتحان‌ها با موفقیت refresh شدند:', exams);
        this.allExams = exams;
        
        // مجدداً وضعیت سالن‌ها را محاسبه کن
        if (this.selectedDate) {
          this.calculateRoomAvailabilities();
        }
      },
      error: (err) => {
        console.error('❌ خطا در refresh امتحان‌ها:', err);
      }
    });
}

  private initializeRoomAvailabilities(): void {
    this.roomAvailabilities = this.allRooms.map(room => ({
      room,
      availability: []
    }));
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
      this.calendarGrid.push(this.createCalendarDay(null));
    }
    
    // اضافه کردن روزهای ماه
    for (let day = 1; day <= daysInMonth; day++) {
      const gregorian = jalaali.toGregorian(this.currentYear, this.currentMonth, day);
      const date = new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);
      const jalaaliDate = `${this.currentYear}/${this.pad(this.currentMonth)}/${this.pad(day)}`;
      
      const isToday = (
        day === this.todayJalaali.jd &&
        this.currentMonth === this.todayJalaali.jm &&
        this.currentYear === this.todayJalaali.jy
      );
      
      const isSelected = this.selectedDate ? 
        date.toDateString() === this.selectedDate.toDateString() : false;
      
      // دریافت تحلیل برای این تاریخ
      const dateAnalysis = this.getRecommendationForDate(date);
      
      const calendarDay: CalendarDay = {
        day,
        jalaaliDate,
        gregorianDate: date,
        isToday,
        isSelected,
        dateAnalysis: dateAnalysis // اضافه کردن تحلیل به روز
      };
      
      this.calendarGrid.push(calendarDay);
    }
  }

  private createCalendarDay(day: number | null): CalendarDay {
    if (day === null) {
      return {
        day: null,
        jalaaliDate: '',
        gregorianDate: null,
        isToday: false,
        isSelected: false,
        dateAnalysis: null
      };
    }
    
    const gregorian = jalaali.toGregorian(this.currentYear, this.currentMonth, day);
    const date = new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);
    const jalaaliDate = `${this.currentYear}/${this.pad(this.currentMonth)}/${this.pad(day)}`;
    
    const isToday = (
      day === this.todayJalaali.jd &&
      this.currentMonth === this.todayJalaali.jm &&
      this.currentYear === this.todayJalaali.jy
    );
    
    const isSelected = this.selectedDate ? 
      date.toDateString() === this.selectedDate.toDateString() : false;
    
    // دریافت تحلیل برای این تاریخ
    const dateAnalysis = this.getRecommendationForDate(date);
    
    const calendarDay: CalendarDay = {
      day,
      jalaaliDate,
      gregorianDate: date,
      isToday,
      isSelected,
      dateAnalysis: dateAnalysis
    };
    
    return calendarDay;
  }

  /**
   * تولید لیست زمان‌ها (از ۸ صبح تا ۸ شب)
   */
  private generateTimeSlots(): void {
    this.timeSlots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute of [0, 30]) {
        const display = `${this.pad(hour)}:${this.pad(minute)}`;
        this.timeSlots.push({
          hour,
          minute,
          display,
          disabled: false
        });
      }
    }
  }

  /**
   * انتخاب امروز به عنوان تاریخ پیش‌فرض
   */
  selectToday(): void {
    const todayGregorian = jalaali.toGregorian(
      this.todayJalaali.jy,
      this.todayJalaali.jm,
      this.todayJalaali.jd
    );
    
    const today = new Date(
      todayGregorian.gy,
      todayGregorian.gm - 1,
      todayGregorian.gd
    );
    
    this.onDateSelect(today, this.todayJalaali);
  }

  /**
   * انتخاب تاریخ از تقویم
   */
  onDateSelect(date: Date, jalaaliDateObj?: any): void {
    this.selectedDate = date;
    
    if (jalaaliDateObj) {
      this.selectedJalaaliDate = `${jalaaliDateObj.jy}/${this.pad(jalaaliDateObj.jm)}/${this.pad(jalaaliDateObj.jd)}`;
    } else {
      const j = jalaali.toJalaali(date);
      this.selectedJalaaliDate = `${j.jy}/${this.pad(j.jm)}/${this.pad(j.jd)}`;
    }
    
    // بروزرسانی وضعیت انتخاب در تقویم
    this.calendarGrid.forEach(day => {
      if (day.gregorianDate) {
        day.isSelected = day.gregorianDate.toDateString() === date.toDateString();
      }
    });
    
    // محاسبه زمان‌های خالی برای این تاریخ
    this.calculateRoomAvailabilities();
  }

  /**
   * محاسبه زمان‌های خالی سالن‌ها برای تاریخ انتخاب شده
   */
/**
 * محاسبه زمان‌های خالی سالن‌ها برای تاریخ انتخاب شده
 */
private calculateRoomAvailabilities(): void {
  if (!this.selectedDate) return;
  
  console.log('📅 تاریخ انتخاب شده:', this.selectedDate);
  
  // گرفتن سال، ماه و روز تاریخ انتخاب شده
  const selectedYear = this.selectedDate.getFullYear();
  const selectedMonth = this.selectedDate.getMonth() + 1;
  const selectedDay = this.selectedDate.getDate();
  
  console.log(`📅 تاریخ: ${selectedYear}/${selectedMonth}/${selectedDay}`);
  
  // برای هر سالن، زمان‌های خالی را محاسبه می‌کنیم
  this.roomAvailabilities.forEach(roomAvailability => {
    const roomExams = this.allExams.filter(exam => {
      // فیلتر امتحان‌های این سالن
      if (exam.room.id !== roomAvailability.room.id) return false;
      
      // بررسی تاریخ امتحان
      const examStart = new Date(exam.startDate);
      const examYear = examStart.getFullYear();
      const examMonth = examStart.getMonth() + 1;
      const examDay = examStart.getDate();
      
      const isSameDate = (
        examYear === selectedYear &&
        examMonth === selectedMonth &&
        examDay === selectedDay
      );
      
      if (isSameDate) {
        console.log(`🏫 سالن ${roomAvailability.room.name}: امتحان "${exam.name}"`);
        console.log(`   شروع: ${exam.startDate} (${examStart.toString()})`);
        console.log(`   پایان: ${exam.endDate}`);
      }
      
      return isSameDate;
    });
    
    console.log(`🏫 سالن ${roomAvailability.room.name}: ${roomExams.length} امتحان`);
    
    // تولید زمان‌های نیم‌ساعته از ۸ صبح تا ۸ شب
    roomAvailability.availability = [];
    
    for (let hour = 8; hour < 20; hour++) {
      for (let minute of [0, 30]) {
        const startTime = `${this.pad(hour)}:${this.pad(minute)}`;
        let endHour = hour;
        let endMinute = minute + 30;
        
        if (endMinute === 60) {
          endHour++;
          endMinute = 0;
        }
        
        const endTime = `${this.pad(endHour)}:${this.pad(endMinute)}`;
        
        // ایجاد زمان‌های بازه (به صورت محلی)
        const slotStart = this.createLocalDate(selectedYear, selectedMonth, selectedDay, hour, minute);
        const slotEnd = this.createLocalDate(selectedYear, selectedMonth, selectedDay, endHour, endMinute);
        
        console.log(`⏰ بررسی بازه ${startTime}-${endTime}:`);
        console.log(`   Slot Start: ${slotStart.toString()}`);
        console.log(`   Slot End: ${slotEnd.toString()}`);
        
        // بررسی آیا این بازه زمانی با امتحانی تداخل دارد
        let isAvailable = true;
        let conflictingExam = '';
        
        for (const exam of roomExams) {
          const examStart = new Date(exam.startDate);
          const examEnd = new Date(exam.endDate);
          
          console.log(`   📝 بررسی تداخل با "${exam.name}":`);
          console.log(`      Exam Start: ${examStart.toString()}`);
          console.log(`      Exam End: ${examEnd.toString()}`);
          
          // بررسی تداخل زمانی
          const hasOverlap = (
            (slotStart >= examStart && slotStart < examEnd) ||
            (slotEnd > examStart && slotEnd <= examEnd) ||
            (slotStart <= examStart && slotEnd >= examEnd)
          );
          
          if (hasOverlap) {
            isAvailable = false;
            conflictingExam = exam.name;
            console.log(`      ❌ تداخل یافت!`);
            break;
          } else {
            console.log(`      ✅ بدون تداخل`);
          }
        }
        
        roomAvailability.availability.push({
          time: `${startTime}-${endTime}`,
          startTime,
          endTime,
          isAvailable,
          examName: conflictingExam
        });
        
        console.log(`   نتیجه: ${isAvailable ? 'خالی' : 'اشغال'} ${conflictingExam ? '(' + conflictingExam + ')' : ''}`);
        console.log('---');
      }
    }
    
    // لاگ برای دیباگ
    const busySlots = roomAvailability.availability.filter(slot => !slot.isAvailable);
    console.log(`🏫 سالن ${roomAvailability.room.name}: ${busySlots.length} بازه اشغال`);
  });
  
  console.log('✅ محاسبه وضعیت سالن‌ها کامل شد');
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
   * انتخاب زمان شروع
   */
  onStartTimeChange(time: string): void {
    this.selectedStartTime = time;
    // بررسی منطقی بودن زمان پایان
    this.validateTimeRange();
  }

  /**
   * انتخاب زمان پایان
   */
  onEndTimeChange(time: string): void {
    this.selectedEndTime = time;
    this.validateTimeRange();
  }

  /**
   * اعتبارسنجی بازه زمانی
   */
  private validateTimeRange(): void {
    const [startHour, startMinute] = this.selectedStartTime.split(':').map(Number);
    const [endHour, endMinute] = this.selectedEndTime.split(':').map(Number);
    
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    
    // غیرفعال کردن زمان‌های قبل از زمان شروع
    this.timeSlots.forEach(slot => {
      const slotTotal = slot.hour * 60 + slot.minute;
      slot.disabled = slotTotal <= startTotal;
    });
    
    // بررسی زمان پایان باید بعد از زمان شروع باشد
    if (endTotal <= startTotal) {
      // اگر زمان پایان قبل از شروع است، یک ساعت به آن اضافه می‌کنیم
      let newEndHour = startHour + 1;
      let newEndMinute = startMinute;
      
      if (newEndHour > 20) {
        newEndHour = 20;
        newEndMinute = 0;
      }
      
      this.selectedEndTime = `${this.pad(newEndHour)}:${this.pad(newEndMinute)}`;
    }
  }

  /**
   * انتخاب سالن
   */
  onRoomSelect(roomId: string): void {
    this.selectedRoomId = roomId;
  }

  /**
   * بررسی وضعیت سالن در بازه زمانی انتخاب شده
   */
  isRoomAvailableForSelectedTime(): boolean {
    if (!this.selectedDate || !this.selectedRoomId) return false;
    
    const roomAvailability = this.roomAvailabilities.find(
      ra => ra.room.id.toString() === this.selectedRoomId
    );
    
    if (!roomAvailability) return false;
    
    // بررسی تمام بازه‌های زمانی انتخابی
    const [startHour, startMinute] = this.selectedStartTime.split(':').map(Number);
    const [endHour, endMinute] = this.selectedEndTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeStr = `${this.pad(currentHour)}:${this.pad(currentMinute)}`;
      const slot = roomAvailability.availability.find(a => a.startTime === timeStr);
      
      if (!slot || !slot.isAvailable) {
        return false;
      }
      
      // حرکت به نیم‌ساعت بعد
      currentMinute += 30;
      if (currentMinute === 60) {
        currentHour++;
        currentMinute = 0;
      }
    }
    
    return true;
  }
  /**
/**
 * ارسال فرم رزرو (نسخه آزمایشی برای debug)
 */
submitReservation(): void {
  // اعتبارسنجی
  if (!this.validateForm()) {
    return;
  }
  
  if (!this.selectedDate || !this.selectedRoomId) {
    this.errorMessage = 'لطفاً تاریخ و سالن را انتخاب کنید';
    return;
  }
  
  // بررسی در دسترس بودن سالن
  if (!this.isRoomAvailableForSelectedTime()) {
    this.errorMessage = 'سالن انتخاب شده در این بازه زمانی در دسترس نیست';
    return;
  }
  
  this.submitting = true;
  this.errorMessage = '';
  this.successMessage = '';
  
  // ساخت تاریخ‌های ISO با زمان محلی
  const [startHour, startMinute] = this.selectedStartTime.split(':').map(Number);
  const [endHour, endMinute] = this.selectedEndTime.split(':').map(Number);
  
  // گرفتن سال، ماه و روز از تاریخ انتخاب شده
  const year = this.selectedDate.getFullYear();
  const month = this.selectedDate.getMonth() + 1;
  const day = this.selectedDate.getDate();
  
  console.log('📅 اطلاعات زمان:');
  console.log('   سال:', year, 'ماه:', month, 'روز:', day);
  console.log('   شروع:', startHour, ':', startMinute);
  console.log('   پایان:', endHour, ':', endMinute);
  
  // تست روش‌های مختلف:
  
  // روش ۱: ایجاد تاریخ با زمان محلی
  const startDateMethod1 = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  const endDateMethod1 = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
  
  // روش ۲: ایجاد رشته ISO دستی
  const isoStart = `${year}-${this.pad(month)}-${this.pad(day)}T${this.pad(startHour)}:${this.pad(startMinute)}:00`;
  const isoEnd = `${year}-${this.pad(month)}-${this.pad(day)}T${this.pad(endHour)}:${this.pad(endMinute)}:00`;
  
  console.log('🧪 تست روش‌های مختلف:');
  console.log('   روش ۱ - new Date():', startDateMethod1.toString());
  console.log('   روش ۱ - ISO:', startDateMethod1.toISOString());
  console.log('   روش ۲ - رشته دستی:', isoStart);
  
  // ساخت درخواست - تست با هر دو روش
  const reservationRequest: ExamReservationRequest = {
    name: this.examName,
    startDate: isoStart, // روش ۲: رشته ISO دستی
    endDate: isoEnd,     // روش ۲: رشته ISO دستی
    course: this.courseId,
    room: this.selectedRoomId
  };
  
  console.log('📤 ارسال درخواست رزرو:', reservationRequest);
  
  // ارسال درخواست
  this.http.post(this.examsApi, reservationRequest)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        console.log('✅ پاسخ سرور:', response);
        
        // اگر سرور امتحان ایجاد شده را برمی‌گرداند، آن را به لیست اضافه کن
        if (response && response.id) {
          const newExam: Exam = {
            id: response.id,
            name: response.name || this.examName,
            startDate: response.startDate || isoStart,
            endDate: response.endDate || isoEnd,
            room: response.room || {
              id: parseInt(this.selectedRoomId),
              name: this.allRooms.find(r => r.id.toString() === this.selectedRoomId)?.name || 'نامشخص',
              capacity: this.allRooms.find(r => r.id.toString() === this.selectedRoomId)?.capacity || 0
            }
          };
          
          console.log('➕ اضافه کردن امتحان جدید به لیست محلی:', newExam);
          this.allExams.push(newExam);
        }
        
        this.successMessage = 'رزرو امتحان با موفقیت ثبت شد!';
        this.submitting = false;
        
        // ۱. بارگذاری مجدد امتحان‌ها از سرور
        this.refreshExams();
        
        // ۲. مجدداً وضعیت سالن‌ها را محاسبه کن
        if (this.selectedDate) {
          console.log('🔄 محاسبه مجدد وضعیت سالن‌ها...');
          this.calculateRoomAvailabilities();
        }
      },
      error: (err) => {
        console.error('❌ خطا در ثبت رزرو:', err);
        this.errorMessage = err.error?.message || 'خطا در ثبت رزرو';
        this.submitting = false;
      }
    });
} 

/**
 * رفرش اجباری داده‌ها
 */
forceRefresh(): void {
  console.log('🔄 رفرش اجباری داده‌ها...');
  
  this.loading = true;
  this.errorMessage = '';
  
  // بارگذاری مجدد همه داده‌ها
  Promise.all([
    this.loadRooms(),
    this.loadExams(),
    this.loadDateAnalysis()
  ]).then(() => {
    this.loading = false;
    
    // اگر تاریخ انتخاب شده‌ای داریم، وضعیت سالن‌ها را مجدد محاسبه کن
    if (this.selectedDate) {
      this.calculateRoomAvailabilities();
    }
    
    // تولید مجدد تقویم برای نمایش تحلیل‌های جدید
    this.generateCalendar();
    
    console.log('✅ رفرش اجباری کامل شد');
  }).catch(err => {
    console.error('❌ خطا در رفرش اجباری:', err);
    this.errorMessage = 'خطا در بروزرسانی اطلاعات';
    this.loading = false;
  });
}

  /**
   * اعتبارسنجی فرم
   */
  private validateForm(): boolean {
    this.examNameError = '';
    
    if (!this.examName.trim()) {
      this.examNameError = 'نام امتحان الزامی است';
      return false;
    }
    
    if (!this.selectedDate) {
      this.errorMessage = 'لطفاً تاریخ را انتخاب کنید';
      return false;
    }
    
    if (!this.selectedRoomId) {
      this.errorMessage = 'لطفاً سالن را انتخاب کنید';
      return false;
    }
    
    return true;
  }

  /**
   * ریست فرم
   */
  private resetForm(): void {
    this.examName = '';
    this.selectedStartTime = '08:00';
    this.selectedEndTime = '10:00';
    this.selectedRoomId = '';
    this.examNameError = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.generateTimeSlots();
  }

  /**
   * بازگشت به صفحه قبل
   */
goBack(): void {
  // اگر از صفحه درس آمده‌اید:
  this.router.navigate(['/courses', this.courseId]);
  // یا اگر می‌خواهید به داشبورد برگردید:
  // this.router.navigate(['/teacher/dashboard']);
}
  // Helper methods
  private getPersianMonthName(month: number): string {
    const monthNames = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    return monthNames[month - 1] || '';
  }

  private pad(num: number): string {
    return String(num).padStart(2, '0');
  }

  /**
   * دریافت نام روز فارسی برای تاریخ
   */
  getPersianDay(date: Date): string {
    try {
      const day = date.getDay();
      const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
      return days[day] || '';
    } catch {
      return '';
    }
  }
  calculateDuration(): number {
  if (!this.selectedStartTime || !this.selectedEndTime) return 0;
  
  const [startHour, startMinute] = this.selectedStartTime.split(':').map(Number);
  const [endHour, endMinute] = this.selectedEndTime.split(':').map(Number);
  
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  
  return endTotal - startTotal;
}
/**
 * دریافت عنوان برای slot
 */
getSlotTitle(slot: any): string {
  if (!slot) return 'نامشخص';
  
  if (slot.isAvailable) {
    return 'خالی';
  } else {
    return slot.examName ? `اشغال: ${slot.examName}` : 'اشغال';
  }
}
/**
 * ساخت Date با زمان محلی (بدون تبدیل به UTC)
 */
private createLocalDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  // روش ۱: استفاده از Date constructor با پارامترهای جداگانه
  // این روش زمان محلی را در نظر می‌گیرد
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * تبدیل Date به ISO string با حفظ ساعت محلی
 */
private toLocalISOString(date: Date): string {
  // این روش ساعت محلی را حفظ می‌کند
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  
  return `${year}-${this.pad(month)}-${this.pad(day)}T${this.pad(hour)}:${this.pad(minute)}:${this.pad(second)}`;
}

/**
 * متد جایگزین: استفاده از UTC اما با offset ایران
 */
private createDateWithIranTimezone(year: number, month: number, day: number, hour: number, minute: number): Date {
  // ایران UTC+3:30 است (در حالت عادی)
  // این تابع تاریخ را با در نظر گرفتن offset ایران می‌سازد
  const date = new Date(Date.UTC(year, month - 1, day, hour - 3, minute - 30, 0));
  return date;
}

/**
 * تبدیل به ISO با offset ایران
 */
private toISOWithIranTimezone(date: Date): string {
  // اضافه کردن ۳:۳۰ ساعت برای ایران
  const iranOffset = 3.5 * 60 * 60 * 1000; // ۳.۵ ساعت به میلی‌ثانیه
  const utcDate = new Date(date.getTime() + iranOffset);
  return utcDate.toISOString();
}
}
