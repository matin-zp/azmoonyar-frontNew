import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

import { SurveyService } from '../services/survey.service';
import { Survey } from '../../models/survey.model';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-survey-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, ButtonModule, Toast],
  templateUrl: `survey.list.pages.html`,
  providers: [MessageService]
})
export class SurveyListPage {

  private surveyService = inject(SurveyService);
  private router = inject(Router);

  surveys$: Observable<Survey[]> = this.surveyService.getSurveys();

  goToCreate() {
    this.router.navigate(['/survey/create']);
  }

  // openSurvey(id: string) {
  //   this.router.navigate(['/survey', id]);
  // }
  openSurvey(id: any) {
  console.log("Survey ID = ", id);
  this.router.navigate(['/survey', id]);
}

}
