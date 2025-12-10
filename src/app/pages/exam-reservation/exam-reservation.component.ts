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

interface CalendarDay {
  day: number | null;
  jalaaliDate: string;
  gregorianDate: Date | null;
  isToday: boolean;
  isSelected: boolean;
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
    
    // بارگذاری همزمان سالن‌ها و امتحان‌ها
    Promise.all([
      this.loadRooms(),
      this.loadExams()
    ]).then(() => {
      this.loading = false;
    }).catch(err => {
      console.error('خطا در بارگذاری داده‌ها:', err);
      this.errorMessage = 'خطا در بارگذاری اطلاعات سیستم';
      this.loading = false;
    });
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
      this.http.get<Exam[]>(this.examsApi)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (exams) => {
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
      
      this.calendarGrid.push({
        day,
        jalaaliDate,
        gregorianDate: date,
        isToday,
        isSelected
      });
    }
  }

  private createCalendarDay(day: number | null): CalendarDay {
    if (day === null) {
      return {
        day: null,
        jalaaliDate: '',
        gregorianDate: null,
        isToday: false,
        isSelected: false
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
    
    return {
      day,
      jalaaliDate,
      gregorianDate: date,
      isToday,
      isSelected
    };
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
  private calculateRoomAvailabilities(): void {
    if (!this.selectedDate) return;
    
    // تبدیل تاریخ انتخاب شده به تاریخ ISO (بدون زمان)
    const selectedDateStr = this.selectedDate.toISOString().split('T')[0];
    
    // فیلتر کردن امتحان‌های این تاریخ
    const examsOnSelectedDate = this.allExams.filter(exam => {
      const examDate = new Date(exam.startDate).toISOString().split('T')[0];
      return examDate === selectedDateStr;
    });
    
    // برای هر سالن، زمان‌های خالی را محاسبه می‌کنیم
    this.roomAvailabilities.forEach(roomAvailability => {
      const roomExams = examsOnSelectedDate.filter(exam => exam.room.id === roomAvailability.room.id);
      
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
          const timeSlot = `${startTime}-${endTime}`;
          
          // بررسی آیا این بازه زمانی با امتحانی تداخل دارد
          let isAvailable = true;
          let conflictingExam = '';
          
          for (const exam of roomExams) {
            const examStart = new Date(exam.startDate);
            const examEnd = new Date(exam.endDate);
            
            const slotStart = new Date(this.selectedDate!);
            const [startHourStr, startMinuteStr] = startTime.split(':');
            slotStart.setHours(parseInt(startHourStr), parseInt(startMinuteStr), 0, 0);
            
            const slotEnd = new Date(this.selectedDate!);
            const [endHourStr, endMinuteStr] = endTime.split(':');
            slotEnd.setHours(parseInt(endHourStr), parseInt(endMinuteStr), 0, 0);
            
            // بررسی تداخل زمانی
            if (
              (slotStart >= examStart && slotStart < examEnd) ||
              (slotEnd > examStart && slotEnd <= examEnd) ||
              (slotStart <= examStart && slotEnd >= examEnd)
            ) {
              isAvailable = false;
              conflictingExam = exam.name;
              break;
            }
          }
          
          roomAvailability.availability.push({
            time: timeSlot,
            startTime,
            endTime,
            isAvailable,
            examName: conflictingExam
          });
        }
      }
    });
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
   * ارسال فرم رزرو
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
    
    // ساخت تاریخ‌های ISO
    const [startHour, startMinute] = this.selectedStartTime.split(':').map(Number);
    const [endHour, endMinute] = this.selectedEndTime.split(':').map(Number);
    
    const startDate = new Date(this.selectedDate);
    startDate.setHours(startHour, startMinute, 0, 0);
    
    const endDate = new Date(this.selectedDate);
    endDate.setHours(endHour, endMinute, 0, 0);
    
    // ساخت درخواست
    const reservationRequest: ExamReservationRequest = {
      name: this.examName,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      course: this.courseId,
      room: this.selectedRoomId
    };
    
    // ارسال درخواست
    this.http.post(this.examsApi, reservationRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('رزرو با موفقیت ثبت شد:', response);
          this.successMessage = 'رزرو امتحان با موفقیت ثبت شد!';
          this.submitting = false;
          
          // ریست فرم
          setTimeout(() => {
            this.resetForm();
          }, 3000);
        },
        error: (err) => {
          console.error('خطا در ثبت رزرو:', err);
          this.errorMessage = err.error?.message || 'خطا در ثبت رزرو';
          this.submitting = false;
        }
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
}