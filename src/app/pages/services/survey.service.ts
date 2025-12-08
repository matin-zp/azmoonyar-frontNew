import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Survey } from '../../models/survey.model';

@Injectable({
  providedIn: 'root'
})
export class SurveyService {

  private surveys: Survey[] = [];

  // ساختن نظرسنجی – فقط ورودی لازم رو بگیره
  createSurvey(input: { title: string; description?: string; options: string[] }): void {
    const survey: Survey = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim(),
      options: input.options,
      votes: input.options.map(() => 0)
    };

    this.surveys.push(survey);
  }

  getSurveys(): Observable<Survey[]> {
    return of(this.surveys);
  }

  getSurveyById(id: string): Observable<Survey | undefined> {
    const survey = this.surveys.find(s => s.id === id);
    return of(survey);
  }

  vote(id: string, optionIndex: number): Observable<Survey | undefined> {
    const survey = this.surveys.find(s => s.id === id);
    if (survey && survey.votes[optionIndex] != null) {
      survey.votes[optionIndex]++;
    }
    // برای راحتی، خود survey آپدیت‌شده رو هم برگردون
    return of(survey);
  }
}
