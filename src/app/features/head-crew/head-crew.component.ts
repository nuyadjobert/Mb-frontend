import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import { InventoryRecord } from '../../core/models/api.models';

@Component({
  selector: 'app-head-crew',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './head-crew.component.html',
})
export class HeadCrewComponent implements OnInit {
  readonly Number = Number;

  shiftNumber: 1 | 2 | 3 = 1;
  recordDate: string = new Date().toISOString().slice(0, 10);
  checkedBy = '';

  records: InventoryRecord[] = [];

  isLoading = false;
  isChecking = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    public authService: AuthService,
    private inventoryService: InventoryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.inventoryService.getRecords(this.shiftNumber, this.recordDate).subscribe({
      next: (res: any) => {
        this.records = res.data ?? res;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load submitted records.';
        this.isLoading = false;
      },
    });
  }

  get allPendingCount(): number {
    return this.records.filter((r) => r.status === 'pending').length;
  }

  get grandTotalSales(): number {
    return Math.round(this.records.reduce((sum, r) => sum + Number(r.total_sales), 0) * 100) / 100;
  }

  checkAndSendToManagement(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.checkedBy.trim()) {
      this.errorMessage = 'Please enter your name before checking this shift.';
      return;
    }
    if (this.records.length === 0) {
      this.errorMessage = 'No submitted records found for this shift/date yet.';
      return;
    }

    this.isChecking = true;

    this.inventoryService.checkShift(this.shiftNumber, this.recordDate, this.checkedBy).subscribe({
      next: () => {
        this.isChecking = false;
        this.router.navigate(['/management'], {
          queryParams: { shift_number: this.shiftNumber, record_date: this.recordDate },
        });
      },
      error: (err) => {
        this.isChecking = false;
        this.errorMessage = err?.error?.message ?? 'Failed to check shift.';
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }
}