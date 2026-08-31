import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BulkSubmitPayload,
  BulkSubmitResponse,
  CheckShiftResponse,
  ShiftPreviewResponse,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private http: HttpClient) {}

  getShiftPreview(shiftNumber: number, recordDate: string): Observable<ShiftPreviewResponse> {
    return this.http.get<ShiftPreviewResponse>(
      `${environment.apiUrl}/inventory-records/shift-preview`,
      { params: { shift_number: shiftNumber, record_date: recordDate } }
    );
  }

  submitShift(payload: BulkSubmitPayload): Observable<BulkSubmitResponse> {
    return this.http.post<BulkSubmitResponse>(
      `${environment.apiUrl}/inventory-records/bulk`,
      payload
    );
  }

  /** Head Crew: list a shift's submitted records (optionally filtered by status). */
  getRecords(shiftNumber: number, recordDate: string, status?: 'pending' | 'checked') {
    const params: Record<string, string | number> = {
      shift_number: shiftNumber,
      record_date: recordDate,
    };
    if (status) params['status'] = status;

    return this.http.get<{ data: any[] }>(`${environment.apiUrl}/inventory-records`, { params });
  }

  checkShift(
    shiftNumber: number,
    recordDate: string,
    checkedBy: string
  ): Observable<CheckShiftResponse> {
    return this.http.post<CheckShiftResponse>(`${environment.apiUrl}/inventory-records/check-shift`, {
      shift_number: shiftNumber,
      record_date: recordDate,
      checked_by: checkedBy,
    });
  }
}