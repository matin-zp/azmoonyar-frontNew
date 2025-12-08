import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-professor-profile',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    FormsModule
  ],
  templateUrl: 'profile.compomemt.html'
})
export class ProfileComponent {

  editDialogVisible = false;

  professor = {
    firstName: 'مهتاب',
    lastName: 'اکبری',
    personnelId: '123456',
    email: 'mahtab@example.com'
  };

  tempData: any = {};

  openEditDialog() {
    this.tempData = { ...this.professor };
    this.editDialogVisible = true;
  }

  saveChanges() {
    this.professor = { ...this.tempData };
    this.editDialogVisible = false;
  }
}

