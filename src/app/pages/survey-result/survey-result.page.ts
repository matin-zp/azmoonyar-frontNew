import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SurveyService } from '../../pages/services/survey.service';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-survey-result',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <div class="p-4 max-w-2xl mx-auto">
      <p-card *ngIf="survey; else loading">
        <h2 class="text-xl font-bold mb-4">نتایج: {{ survey.title }}</h2>

        <div
          *ngFor="let opt of survey.options; let i = index"
          class="mb-3 px-3 py-2 border rounded-lg">
          <p class="font-bold">{{ opt }}</p>
          <p>تعداد رأی: {{ survey.votes[i] }}</p>

          <div class="w-full bg-gray-300 h-3 rounded mt-1">
            <div
              class="h-3 bg-blue-600 rounded"
              [style.width.%]="percent(i)">
            </div>
          </div>
        </div>
      </p-card>

      <ng-template #loading>
        <p>در حال بارگذاری...</p>
      </ng-template>
    </div>
  `
})
export class SurveyResultPage {
  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);

  survey: any;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.surveyService.getSurveys().subscribe(list => {
      this.survey = list.find((s: any) => s.id === id);
    });
  }

  percent(i: number) {
    if (!this.survey) return 0;
    const total = this.survey.votes.reduce((a: number, b: number) => a + b, 0);
    return total === 0 ? 0 : (this.survey.votes[i] / total) * 100;
  }
}
