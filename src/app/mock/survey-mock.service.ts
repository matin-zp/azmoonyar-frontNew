import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

// مدل اولیه داده‌ها
export interface MockSurvey {
  id: number;
  title: string;
  options: string[];
  votes: number[];
}

@Injectable({
  providedIn: 'root'
})
export class SurveyMockService {

  // دیتابیس FAKE داخل حافظه
  private surveys: MockSurvey[] = [
 
  ];

  // دریافت لیست نظرسنجی‌ها
  getSurveys(): Observable<MockSurvey[]> {
    return of(this.surveys).pipe(delay(500));
  }

  // ایجاد نظرسنجی جدید
  createSurvey(data: { title: string; options: string[] }): Observable<MockSurvey> {
    const newSurvey: MockSurvey = {
      id: this.surveys.length + 1,
      title: data.title,
      options: data.options,
      votes: data.options.map(() => 0)
    };

    this.surveys.push(newSurvey);

    return of(newSurvey).pipe(delay(500));
  }

  // رأی دادن
  vote(id: number, optionIndex: number): Observable<any> {
    const survey = this.surveys.find(s => s.id === id);
    if (survey) {
      survey.votes[optionIndex]++;
    }
    return of({ message: 'ثبت شد' }).pipe(delay(300));
  }
}
