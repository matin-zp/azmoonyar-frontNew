import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SurveyService } from '../services/survey.service';
import { Survey } from '../../models/survey.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './survey-detail.page.html',
  styleUrls: ['./survey.detail.page.css']
})
export class SurveyDetailPage implements OnInit {

  survey?: Survey;
  showResults = true;

  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.surveyService.getSurveyById(id).subscribe(s => {
        this.survey = s;
      });
    }
  }

  vote(index: number) {
    if (!this.survey) return;

    const surveyId = this.survey.id;
    const storageKey = `vote_${surveyId}`;

    const previousVote = localStorage.getItem(storageKey);
    const prevIndex = previousVote !== null ? parseInt(previousVote) : null;

    // اگر قبلاً رأی داده → رأی قبلی را کم کن
    if (prevIndex !== null) {
      this.survey.votes[prevIndex]--;
    }

    // رأی جدید اضافه کن
    this.survey.votes[index]++;

    // ذخیره رأی در localStorage
    localStorage.setItem(storageKey, index.toString());

    this.showResults = true;
  }

  get totalVotes(): number {
    return this.survey ? this.survey.votes.reduce((a, b) => a + b, 0) : 0;
  }

  getVotePercent(i: number): number {
    if (!this.survey) return 0;
    if (this.totalVotes === 0) return 0;
    return (this.survey.votes[i] / this.totalVotes) * 100;
  }
}
