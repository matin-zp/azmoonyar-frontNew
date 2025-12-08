import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { OverlayModule } from 'primeng/overlay';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { JalaliDatepickerComponent } from '../detePicker.compomemt/datePiker.component';
import * as jalaali from 'jalaali-js';

type RoomKey = 'farabi' | 'ferdowsi' | 'saadi' | 'hafez' | 'khayyam' | 'molana';

interface ExamDto {
  id: number;
  name: string;
  startDate: string;   // 2026-01-28T10:00:00
  endDate: string;
  room: { id: number; name: string; capacity: number };
}

interface SavedExamView {
  id: number;
  roomId: number;
  roomName: string;
  name: string;
  date: string;        // تاریخ شمسی مثل 1404/11/08
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
}

@Component({
  selector: 'home-reservation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    OverlayModule,
    HttpClientModule,
    JalaliDatepickerComponent
  ],
  templateUrl: './reservation.component.html',
  styleUrls: ['./reservation.component.css']
})
export class ReservationComponent {

  apiBase = 'https://cheap-tones-intensive-wives.trycloudflare.com/api/exams';

  roomList: RoomKey[] = ['farabi', 'ferdowsi', 'saadi', 'hafez', 'khayyam', 'molana'];

  roomIds: Record<RoomKey, number> = {
    farabi: 1,
    ferdowsi: 2,
    saadi: 3,
    hafez: 4,
    khayyam: 5,
    molana: 6
  };

  overlayVisible: Record<RoomKey, boolean> = {
    farabi: false,
    ferdowsi: false,
    saadi: false,
    hafez: false,
    khayyam: false,
    molana: false
  };

  reservations: Record<RoomKey, { lessonName: string; date: string; startTime: string; endTime: string }> = {
    farabi: { lessonName: '', date: '', startTime: '', endTime: '' },
    ferdowsi: { lessonName: '', date: '', startTime: '', endTime: '' },
    saadi: { lessonName: '', date: '', startTime: '', endTime: '' },
    hafez: { lessonName: '', date: '', startTime: '', endTime: '' },
    khayyam: { lessonName: '', date: '', startTime: '', endTime: '' },
    molana: { lessonName: '', date: '', startTime: '', endTime: '' }
  };

  savedReservations: SavedExamView[] = [];

  constructor(private http: HttpClient) {
    this.loadReservationsFromApi();
  }

  // ---------- GET همه امتحان‌ها از بک‌اند ----------
  loadReservationsFromApi(): void {
    this.http.get<ExamDto[]>(this.apiBase).subscribe({
      next: exams => {
        this.savedReservations = exams.map(e => this.mapExamDtoToView(e));
      },
      error: err => console.error('❌ API GET error:', err)
    });
  }

  // تبدیل DTO بک‌اند به مدل نمایشی (با تاریخ شمسی)
  private mapExamDtoToView(dto: ExamDto): SavedExamView {
    const start = new Date(dto.startDate);
    const end   = new Date(dto.endDate);

    // تبدیل تاریخ میلادی به شمسی
    const j = jalaali.toJalaali(
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate()
    );
    const pad = (n: number) => n.toString().padStart(2, '0');
    const jalaliDate = `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;

    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const endTime   = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

    return {
      id: dto.id,
      roomId: dto.room.id,
      roomName: dto.room.name,
      name: dto.name,
      date: jalaliDate,     // ✅ حالا تاریخ شمسی
      startTime,
      endTime
    };
  }

  // ---------- Popup ----------
  showOverlay(room: RoomKey, event: MouseEvent): void {
    event.stopPropagation();
    this.roomList.forEach(key => (this.overlayVisible[key] = false));
    this.overlayVisible[room] = true;
  }

  @HostListener('document:click', ['$event'])
  hidePopup(event: MouseEvent): void {
    const inside = (event.target as HTMLElement).closest('.p-overlay, input, button');
    if (!inside) {
      this.roomList.forEach(key => (this.overlayVisible[key] = false));
    }
  }

  onDateSelected(room: RoomKey, date: string): void {
    this.reservations[room].date = date;
  }

  // ---------- تبدیل تاریخ شمسی + ساعت به ISO برای بک‌اند ----------
  private jalaliToIso(jdate: string, time: string): string {
    const [jy, jm, jd] = jdate.split('/').map(x => +x);
    const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const datePart = `${gy}-${pad(gm)}-${pad(gd)}`;

    return `${datePart}T${time}:00`;
  }

  // ---------- ثبت امتحان ----------
  saveDateTime(room: RoomKey): void {
    const r = this.reservations[room];
    if (!r.lessonName || !r.date || !r.startTime || !r.endTime) {
      alert('همه فیلدها لازم هستند');
      return;
    }

    const payload = {
      name: r.lessonName,
      startDate: this.jalaliToIso(r.date, r.startTime),
      endDate: this.jalaliToIso(r.date, r.endTime)
    };

    this.http.post(`${this.apiBase}/${this.roomIds[room]}`, payload).subscribe({
      next: () => {
        this.loadReservationsFromApi();
        this.overlayVisible[room] = false;
        this.reservations[room] = { lessonName: '', date: '', startTime: '', endTime: '' };
      },
      error: err => console.error('❌ API POST error:', err)
    });
  }

  // ---------- حذف امتحان ----------
  deleteExam(id: number): void {
    if (!confirm('آیا از حذف این امتحان مطمئن هستید؟')) return;

    this.http.delete(`${this.apiBase}/${id}`).subscribe({
      next: () => {
        console.log('🗑 حذف شد:', id);
        this.loadReservationsFromApi();
      },
      error: err => console.error('❌ API DELETE error:', err)
    });
  }
}
