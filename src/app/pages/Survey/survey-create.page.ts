import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';

import { SurveyService } from '../services/survey.service';
import { Survey } from '../../models/survey.model';

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 max-w-xl mx-auto">

      <h2 class="text-xl font-bold mb-4">ایجاد نظرسنجی جدید</h2>

      <form #f="ngForm" (ngSubmit)="onSubmit()">

        <!-- عنوان -->
        <label class="font-semibold block mb-1">عنوان نظرسنجی</label>
        <input
          class="border p-2 w-full rounded mb-3"
          [(ngModel)]="title"
          name="title"
          required
          placeholder="مثال: بهترین زمان برگزاری امتحان"
        />

        <!-- توضیحات -->
        <label class="font-semibold block mb-1">توضیحات (اختیاری)</label>
        <textarea
          class="border p-2 w-full rounded mb-3"
          [(ngModel)]="description"
          name="description"
          placeholder="توضیح کوتاه درباره نظرسنجی"
        ></textarea>

        <!-- گزینه‌ها -->
        <h3 class="font-semibold mt-4 mb-2">گزینه‌ها:</h3>

        <div
          *ngFor="let opt of options; let i = index; trackBy: trackByIndex"
          class="flex gap-2 mb-2"
        >
          <input
            class="border p-2 flex-1 rounded"
            [(ngModel)]="options[i]"
            name="opt{{ i }}"
            placeholder="گزینه رأی‌دهی"
          />

          <button
            type="button"
            class="bg-red-500 text-white px-3 rounded"
            (click)="removeOption(i)"
          >
            حذف
          </button>
        </div>

        <!-- افزودن گزینه -->
        <button
          type="button"
          class="bg-gray-700 text-white px-4 py-1 rounded mb-4"
          (click)="addOption()"
        >
          + افزودن گزینه
        </button>

        <!-- دکمه ثبت -->
        <button
          type="submit"
          class="bg-blue-600 text-white p-2 rounded w-full"
        >
          ثبت نظرسنجی
        </button>

      </form>
    </div>
  `
})
export class SurveyCreatePage {

  title = '';
  description = '';
  options: string[] = [''];

  private surveyService = inject(SurveyService);
  private router = inject(Router);

  // جلوگیری از رندر مجدد ngFor
  trackByIndex(index: number) {
    return index;
  }

  addOption() {
    this.options.push('');
  }

  removeOption(i: number) {
    this.options.splice(i, 1);
    if (this.options.length === 0) {
      this.options.push('');
    }
  }

  onSubmit() {
    const cleanOptions = this.options
      .map(o => o.trim())
      .filter(o => o.length > 0);

    if (!this.title.trim() || cleanOptions.length === 0) {
      alert('عنوان و حداقل یک گزینه لازم است');
      return;
    }

    const newSurvey: Omit<Survey, 'id'> = {
      title: this.title.trim(),
      description: this.description.trim(),
      options: cleanOptions,
      votes: Array(cleanOptions.length).fill(0)
    };

    this.surveyService.createSurvey(newSurvey);
    alert('نظرسنجی با موفقیت ایجاد شد');
    this.router.navigate(['/survey']);
  }
}
