import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({providedIn: 'root'})
export class AppService {

    http= inject(HttpClient)
    
    
    getPosts(){
        return this.http.get('https://fakestoreapi.com/products')

     }
    
}