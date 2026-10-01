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

  getShiftPreview(
    shiftNumber: number,
    recordDate: string
  ): Observable<ShiftPreviewResponse> {
    return this.http.get<ShiftPreviewResponse>(
      `${environment.apiUrl}/inventory-records/shift-preview`,
      {
        params: {
          shift_number: shiftNumber,
          record_date: recordDate,
        },
      }
    );
  }

  submitShift(
    payload: BulkSubmitPayload
  ): Observable<BulkSubmitResponse> {
    return this.http.post<BulkSubmitResponse>(
      `${environment.apiUrl}/inventory-records/bulk`,
      payload
    );
  }

  getRecords(
    shiftNumber: number,
    recordDate: string,
    status?: 'pending' | 'checked'
  ) {
    const params: Record<string, string | number> = {
      shift_number: shiftNumber,
      record_date: recordDate,
    };

    if (status) {
      params['status'] = status;
    }

    return this.http.get<{ data: any[]; total?: number }>(
      `${environment.apiUrl}/inventory-records`,
      { params }
    );
  }

  /**
   * Head Crew:
   * Confirm one inventory record without editing it.
   */
  checkRecord(
    recordId: number,
    checkedBy: string
  ): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/inventory-records/${recordId}/check`,
      {
        checked_by: checkedBy,
      }
    );
  }

  /**
   * Head Crew:
   * Edit one inventory record, require a reason,
   * recalculate its values, then mark it as checked.
   */
  editAndCheckRecord(
    recordId: number,
    payload: {
      beginning_qty: number;
      del_qty: number;
      out_qty: number;
      ending_qty: number;
      reason: string;
      checked_by: string;
    }
  ): Observable<any> {
    return this.http.put<any>(
      `${environment.apiUrl}/inventory-records/${recordId}/head-crew-edit`,
      payload
    );
  }

  /**
   * Existing shift-level checking method.
   * Kept for compatibility.
   */
  checkShift(
    shiftNumber: number,
    recordDate: string,
    checkedBy: string
  ): Observable<CheckShiftResponse> {
    return this.http.post<CheckShiftResponse>(
      `${environment.apiUrl}/inventory-records/check-shift`,
      {
        shift_number: shiftNumber,
        record_date: recordDate,
        checked_by: checkedBy,
      }
    );
  }
}