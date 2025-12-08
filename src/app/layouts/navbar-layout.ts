import { Component, inject } from '@angular/core';
import { RouterOutlet,Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SliderModule } from 'primeng/slider';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar-layout.html',
  standalone: true,
  imports:[ButtonModule,RouterOutlet,DrawerModule,SliderModule]

})
export class NavbarComponent { 
  router = inject(Router)
  visibleSidebar: boolean = false;

  profile = {
    name: "استاد مهتاب",
    email: "mah@example.com"
  };


  
  onclickHome(){

    this.router.navigate(['/home'])

  }
  onClickTodo(){
    this.router.navigate(['/toDoList'])
  }

  onClickLogIn(){
    this.router.navigate(['/login'])
  }
  onClickCorse(){
    this.router.navigate(['/course'])
  }
onClickprofile()  {
    this.router.navigate(['/profile'])
  }
  onClickReservation() {
     this.router.navigate(['/RoomReservation'])
  }
}