// src/app/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // دریافت توکن از localStorage یا sessionStorage
  const token = localStorage.getItem('token') || 
                localStorage.getItem('access_token') ||
                sessionStorage.getItem('token') ||
                sessionStorage.getItem('access_token');
  
  // اگر توکن وجود داشت، به هدر درخواست اضافه کن
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }
  
  // اگر توکن نبود، درخواست را بدون تغییر بفرست
  return next(req);
};