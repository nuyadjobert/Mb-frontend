import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CashCount, CashCountPayload } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CashCountService {
  constructor(private http: HttpClient) {}

  getCashCount(shiftNumber: number, recordDate: string): Observable<CashCount | null> {
    return this.http.get<CashCount | null>(`${environment.apiUrl}/cash-counts`, {
      params: { shift_number: shiftNumber, record_date: recordDate },
    });
  }

  submitCashCount(payload: CashCountPayload): Observable<CashCount> {
    return this.http.post<CashCount>(`${environment.apiUrl}/cash-counts`, payload);
  }

    finalize(shiftNumber: number, recordDate: string, finalizedBy: string): Observable<CashCount> {
    return this.http.post<CashCount>(`${environment.apiUrl}/cash-counts/finalize`, {
      shift_number: shiftNumber,
      record_date: recordDate,
      finalized_by: finalizedBy,
    });
  }
}