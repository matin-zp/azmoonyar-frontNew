import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/auth.interceptor';  // مسیر درست فایل خودت
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
     provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor])   // 🔥 اینجا تابع رو می‌دیم، نه کلاس
    ), provideAnimationsAsync()
  ]
}).catch(err => console.error(err));
