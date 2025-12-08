import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CoursesService } from '../services/course.service';
import { Course } from '../../models/course.model';
import * as jalaali from 'jalaali-js';

// ---- مدل امتحان از بک‌اند
interface ExamDto {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  room: { id: number; name: string; capacity: number };
}

// ---- مدل فرانت برای نمایش
interface UpcomingExamView {
  id: number;
  roomName: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  startMillis: number;
  weekColor: number; // 0 / 1 / 2
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    CardModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: 'home.component.html',
  styleUrls: ['home.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class mainPageComponent implements OnInit {

  examsApi = 'localhost:8081/api/exams';

  todayOverview = [
    'تعداد امتحانات امروز: 1',
    'کلاس‌های امروز: 2',
    'اعلان‌های جدید: 3'
  ];

  upcomingExams: UpcomingExamView[] = [];
  maxVisibleExams = 5;
  showAllExams = false;

  get visibleExams(): UpcomingExamView[] {
    return this.showAllExams ? this.upcomingExams : this.upcomingExams.slice(0, 5);
  }

  myCourses: Course[] = [];

  // 📅 تقویم شمسی
  today = jalaali.toJalaali(new Date());
  currentYear = this.today.jy;
  currentMonth = this.today.jm;
  monthName = '';
  daysOfWeek = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  calendarGrid: (number | null)[] = [];

  constructor(private http: HttpClient, private coursesService: CoursesService) {}

  ngOnInit(): void {
    this.loadUpcomingExams();
    this.loadMyCourses();
    this.generateCalendar();
  }

  // =====================================================
  // 🔵 ۱) دریافت امتحان‌های آینده از بک‌اند
  // =====================================================
  loadUpcomingExams(): void {
    this.http.get<ExamDto[]>(this.examsApi).subscribe({
      next: (exams) => {
        this.upcomingExams = exams
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .map(e => this.mapExam(e));
      },
      error: err => console.error("❌ Error loading exams:", err)
    });
  }

  // 📌 تبدیل DTO → مدل قابل نمایش
  private mapExam(dto: ExamDto): UpcomingExamView {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    // تبدیل تاریخ میلادی → جلالی
    const j = jalaali.toJalaali(start.getFullYear(), start.getMonth() + 1, start.getDate());
    const pad = (n: number) => String(n).padStart(2, '0');

    // 🎨 تعیین رنگ بر اساس هفته واقعی تقویم شمسی
    const weekNumber = Math.floor((j.jd - 1) / 7);   // هر ۷ روز → هفته جدید
    const weekColor = weekNumber % 3;                // فقط سه رنگ 0,1,2

    return {
      id: dto.id,
      roomName: dto.room.name.trim(),
      name: dto.name,
      date: `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`,
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      startMillis: start.getTime(),
      weekColor
    };
  }

  toggleShowMore(): void {
    this.showAllExams = !this.showAllExams;
  }

  // ⛔ آیا امتحان گذشته؟
  isExamPast(exam: UpcomingExamView): boolean {
    return exam.startMillis < Date.now();
  }

  // 🎨 تعیین کلاس رنگ هفته
  getWeekCssClass(index: number): string {
    return `week-color-${index}`;
  }

  // =====================================================
  // 🔵 ۲) دریافت درس‌های من با نقش از توکن (teacher/student)
  // =====================================================
  loadMyCourses(): void {
    this.coursesService.getMyCourses().subscribe({
      next: (res) => {
        this.myCourses = res ?? [];
      },
      error: err => console.error("❌ Error loading courses:", err)
    });
  }

  // =====================================================
  // 🔵 ۳) ساخت تقویم شمسی
  // =====================================================
  generateCalendar(): void {
    this.calendarGrid = [];
    this.monthName = getPersianMonthName(this.currentMonth);

    const days = jalaali.jalaaliMonthLength(this.currentYear, this.currentMonth);
    const g = jalaali.toGregorian(this.currentYear, this.currentMonth, 1);

    const firstDay = new Date(g.gy, g.gm - 1, g.gd).getDay();
    const offset = (firstDay + 1) % 7;

    for (let i = 0; i < offset; i++) this.calendarGrid.push(null);
    for (let d = 1; d <= days; d++) this.calendarGrid.push(d);
  }

  isToday(day: number | null): boolean {
    return (
      day === this.today.jd &&
      this.currentMonth === this.today.jm &&
      this.currentYear === this.today.jy
    );
  }

  prevMonth(): void {
    if (this.currentMonth === 1) { this.currentMonth = 12; this.currentYear--; }
    else this.currentMonth--;
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth === 12) { this.currentMonth = 1; this.currentYear++; }
    else this.currentMonth++;
    this.generateCalendar();
  }

  prevYear(): void { this.currentYear--; this.generateCalendar(); }
  nextYear(): void { this.currentYear++; this.generateCalendar(); }
}

// =====================================================
// نام ماه‌های شمسی
// =====================================================
function getPersianMonthName(m: number): string {
  return [
    'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
    'مهر','آبان','آذر','دی','بهمن','اسفند'
  ][m - 1];
}
