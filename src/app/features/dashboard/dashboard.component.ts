import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import { BulkSubmitPayload } from '../../core/models/api.models';

interface Row {
  item_id: number;
  item_name: string;
  unit: string;
  price: number;
  divisor: number;
  beginning_qty: number;
  beginning_qty_auto: number; // the system-calculated value, kept for comparison
  beginning_override_reason: string;
  del_qty: number;
  out_qty: number;
  ending_qty: number | null;
  usage_qty: number;
  total_order: number;
  total_sales: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  shiftNumber: 1 | 2 | 3 = 1;
  recordDate: string = this.today();
  crewName = '';

  rows: Row[] = [];

  isLoading = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    public authService: AuthService,
    private inventoryService: InventoryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadShift();
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadShift(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.inventoryService.getShiftPreview(this.shiftNumber, this.recordDate).subscribe({
      next: (res) => {
        this.rows = res.items.map((item) => {
          const existing = item.existing_record;
          const row: Row = {
            item_id: item.item_id,
            item_name: item.item_name,
            unit: item.unit,
            price: item.price,
            divisor: item.divisor,
            beginning_qty: item.beginning_qty,
            beginning_qty_auto: item.beginning_qty, // auto value = what shift-preview resolved
            beginning_override_reason: existing?.beginning_override_reason ?? '',
            del_qty: existing?.del_qty ?? 0,
            out_qty: existing?.out_qty ?? 0,
            ending_qty: existing?.ending_qty ?? null,
            usage_qty: 0,
            total_order: 0,
            total_sales: 0,
          };
          this.recalculateRow(row);
          return row;
        });

        const alreadySubmitted = res.items.find((i) => i.existing_record?.crew_name);
        if (alreadySubmitted?.existing_record?.crew_name) {
          this.crewName = alreadySubmitted.existing_record.crew_name;
        }

        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load shift data.';
        this.isLoading = false;
      },
    });
  }

  /** True if the crew has manually changed Beginning away from the auto-calculated value. */
  isBeginningOverridden(row: Row): boolean {
    return Math.abs(row.beginning_qty - row.beginning_qty_auto) > 0.001;
  }

  /** Reset a row's Beginning back to the auto-calculated value and clear the reason. */
  resetBeginning(row: Row): void {
    row.beginning_qty = row.beginning_qty_auto;
    row.beginning_override_reason = '';
    this.recalculateRow(row);
  }

  recalculateRow(row: Row): void {
    const ending = row.ending_qty ?? 0;
    const usage = row.beginning_qty + row.del_qty - row.out_qty - ending;
    const divisor = row.divisor > 0 ? row.divisor : 1;
    const totalOrder = usage / divisor;

    row.usage_qty = Math.round(usage * 100) / 100;
    row.total_order = Math.round(totalOrder * 100) / 100;
    row.total_sales = Math.round(totalOrder * row.price * 100) / 100;
  }

  get grandTotalSales(): number {
    return Math.round(this.rows.reduce((sum, r) => sum + r.total_sales, 0) * 100) / 100;
  }

  submitShift(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.crewName.trim()) {
      this.errorMessage = 'Please enter the crew name before submitting.';
      return;
    }

    const incompleteRow = this.rows.find((r) => r.ending_qty === null);
    if (incompleteRow) {
      this.errorMessage = `Please enter the Ending qty for "${incompleteRow.item_name}".`;
      return;
    }

    // Any row whose Beginning was manually changed must have a reason filled in.
    const missingReason = this.rows.find(
      (r) => this.isBeginningOverridden(r) && !r.beginning_override_reason.trim()
    );
    if (missingReason) {
      this.errorMessage = `Please enter a reason for correcting the Beginning qty of "${missingReason.item_name}".`;
      return;
    }

    const payload: BulkSubmitPayload = {
      shift_number: this.shiftNumber,
      record_date: this.recordDate,
      crew_name: this.crewName.trim(),
      items: this.rows.map((r) => ({
        item_id: r.item_id,
        beginning_qty: r.beginning_qty,
        beginning_override_reason: this.isBeginningOverridden(r)
          ? r.beginning_override_reason.trim()
          : null,
        del_qty: r.del_qty,
        out_qty: r.out_qty,
        ending_qty: r.ending_qty as number,
      })),
    };

    this.isSubmitting = true;

    this.inventoryService.submitShift(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = `Shift ${res.shift_number} saved successfully. Total sales: ₱${res.shift_total_sales.toFixed(2)}`;
        this.loadShift();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message ?? err?.error?.errors?.items?.[0] ?? 'Failed to submit shift.';
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}