import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly base = environment.apiUrl;

  get<T>(path: string, params: Record<string, any> = {}): Observable<T> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<T>(`${this.base}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: any = {}): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  patch<T>(path: string, body: any = {}): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }

  postForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, formData);
  }

  patchForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, formData);
  }

  put<T>(path: string, body: any = {}): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }

  putForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, formData);
  }
}
