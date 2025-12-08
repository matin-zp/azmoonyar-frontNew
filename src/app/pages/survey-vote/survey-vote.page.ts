import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SurveyService } from '../../pages/services/survey.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-survey-vote',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, Toast],
  providers: [MessageService],
  template: `
    <div class="p-4 max-w-2xl mx-auto">
      <p-card *ngIf="survey; else loading">
        <h2 class="text-xl font-bold mb-4">{{ survey.title }}</h2>

        <div *ngFor="let opt of survey.options; let i = index" class="mb-2">
          <button
            pButton
            class="w-full"
            label="{{ opt }}"
            (click)="vote(i)">
          </button>
        </div>
      </p-card>

      <ng-template #loading>
        <p>در حال بارگذاری...</p>
      </ng-template>

      <p-toast></p-toast>
    </div>
  `
})
export class SurveyVotePage {
  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);
  private msg = inject(MessageService);

  survey: any;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.surveyService.getSurveys().subscribe(list => {
      this.survey = list.find((s: any) => s.id === id);
    });
  }

  vote(index: number) {
    this.surveyService.vote(this.survey.id, index).subscribe(() => {
      this.msg.add({
        severity: 'success',
        summary: 'ثبت شد',
        detail: 'نظر شما با موفقیت ثبت گردید'
      });
    });
  }
}
