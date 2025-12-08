import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import * as jalaali from 'jalaali-js';
import { Init } from 'v8';

@Component({
  selector: 'jalali-datepicker',
  standalone: true,
  templateUrl: './datePiker.component.html',
})
export class JalaliDatepickerComponent implements OnInit {
  today = jalaali.toJalaali(new Date());
  selectedYear = this.today.jy;
  selectedMonth = this.today.jm;
  selectedDay: number | null = null;
  daysOfWeek = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  

  @Output() dateSelected = new EventEmitter<string>();
ngOnInit() {
  this.generateCalendar();
}


  get daysInMonth(): number {
    return jalaali.jalaaliMonthLength(this.selectedYear, this.selectedMonth);
  }

  get days(): number[] {
    return Array.from({ length: this.daysInMonth }, (_, i) => i + 1);
  }

  get monthName(): string {
    return getPersianMonthName(this.selectedMonth);
  }

  selectDay(day: number) {
    this.selectedDay = day;
    const formatted = `${this.selectedYear}/${this.selectedMonth}/${day}`;
    this.dateSelected.emit(formatted);
  }
  changeMonth(direction: 'prev' | 'next') {
  if (direction === 'prev') {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
  } else {
    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
  }
  this.generateCalendar();

}
calendarGrid: (number | null)[] = [];

generateCalendar() {
  this.calendarGrid = [];

  const { selectedYear: jy, selectedMonth: jm } = this;

  // محاسبه روز اول ماه شمسی به میلادی
  const firstGregorian = jalaali.toGregorian(jy, jm, 1);
  const firstDate = new Date(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd);

  // محاسبه offset برای چیدن روزها
  const offset = (firstDate.getDay() + 1) % 7; // شنبه = 0

  // اضافه کردن خانه‌های خالی قبل از روز اول
  for (let i = 0; i < offset; i++) {
    this.calendarGrid.push(null);
  }

  // اضافه کردن روزهای واقعی ماه
  const daysInMonth = jalaali.jalaaliMonthLength(jy, jm);
  for (let day = 1; day <= daysInMonth; day++) {
    this.calendarGrid.push(day);
  }
}


}

function getPersianMonthName(month: number): string {
  const names = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  return names[month - 1] ?? 'نامعتبر';
}
