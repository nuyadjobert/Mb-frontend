import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CashCountService } from '../../core/services/cash-count.service';
import { CashCountPayload } from '../../core/models/api.models';

interface DenomRow {
  value: number;
  label: string;
  qty: number;
  hasSerials: boolean;
}

@Component({
  selector: 'app-cash-count',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-count.component.html',
})
export class CashCountComponent implements OnInit {
  shiftNumber: 1 | 2 | 3 = 1;
  recordDate: string = new Date().toISOString().slice(0, 10);
  crewName = '';

  denominations: DenomRow[] = [
    { value: 1000, label: '₱1000', qty: 0, hasSerials: true },
    { value: 500, label: '₱500', qty: 0, hasSerials: true },
    { value: 100, label: '₱100', qty: 0, hasSerials: false },
    { value: 50, label: '₱50', qty: 0, hasSerials: false },
    { value: 20, label: '₱20', qty: 0, hasSerials: false },
    { value: 10, label: '₱10', qty: 0, hasSerials: false },
    { value: 5, label: '₱5', qty: 0, hasSerials: false },
    { value: 1, label: '₱1', qty: 0, hasSerials: false },
  ];

  serials1000: string[] = [];
  serials500: string[] = [];

  totalExpenses = 0;
  notes = '';

  isLoading = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    public authService: AuthService,
    private cashCountService: CashCountService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;

    const shiftParam = qp.get('shift_number');
    const dateParam = qp.get('record_date');
    const crewParam = qp.get('crew_name');

    if (shiftParam) {
      this.shiftNumber = Number(shiftParam) as 1 | 2 | 3;
    }

    if (dateParam) {
      this.recordDate = dateParam;
    }

    if (crewParam) {
      this.crewName = crewParam;
    }

    this.loadExisting();
  }

  loadExisting(): void {
    this.isLoading = true;

    this.cashCountService
      .getCashCount(this.shiftNumber, this.recordDate)
      .subscribe({
        next: (existing) => {
          if (existing) {
            this.denominations.forEach((row) => {
              const key = `pieces_${row.value}` as keyof typeof existing;
              row.qty = Number(existing[key] ?? 0);
            });

            this.serials1000 = existing.serials_1000 ?? [];
            this.serials500 = existing.serials_500 ?? [];

            this.resizeSerials(1000);
            this.resizeSerials(500);

            this.totalExpenses = Number(
              existing.total_expenses ?? 0
            );

            this.notes = existing.notes ?? '';
            this.crewName =
              existing.crew_name ?? this.crewName;
          }

          this.isLoading = false;
        },

        error: () => {
          this.isLoading = false;
        },
      });
  }

  onQtyChange(row: DenomRow): void {
    if (row.qty < 0) {
      row.qty = 0;
    }

    if (row.value === 1000) {
      this.resizeSerials(1000);
    }

    if (row.value === 500) {
      this.resizeSerials(500);
    }

    // Clear any old error after quantity changes.
    this.validateSerials();
  }

  private resizeSerials(denom: 1000 | 500): void {
    const row = this.denominations.find(
      (d) => d.value === denom
    )!;

    const arr =
      denom === 1000
        ? this.serials1000
        : this.serials500;

    while (arr.length < row.qty) {
      arr.push('');
    }

    while (arr.length > row.qty) {
      arr.pop();
    }
  }

  /**
   * Called whenever a serial number changes.
   * Normalizes the serial and immediately validates it.
   */
  onSerialChange(
    denom: 1000 | 500,
    index: number
  ): void {
    const arr =
      denom === 1000
        ? this.serials1000
        : this.serials500;

    if (arr[index] !== undefined) {
      arr[index] = arr[index]
        .trim()
        .toUpperCase();
    }

    this.validateSerials();
  }

  /**
   * Returns true if this serial number is duplicated
   * within its own denomination.
   */
  isDuplicateSerial(
    denom: 1000 | 500,
    index: number
  ): boolean {
    const arr =
      denom === 1000
        ? this.serials1000
        : this.serials500;

    const serial = this.normalizeSerial(arr[index]);

    if (!serial) {
      return false;
    }

    return arr.some(
      (value, i) =>
        i !== index &&
        this.normalizeSerial(value) === serial
    );
  }

  /**
   * Returns true if this serial number is also being
   * used for the other denomination.
   */
  isCrossDenominationDuplicate(
    denom: 1000 | 500,
    index: number
  ): boolean {
    const current =
      denom === 1000
        ? this.serials1000
        : this.serials500;

    const other =
      denom === 1000
        ? this.serials500
        : this.serials1000;

    const serial = this.normalizeSerial(current[index]);

    if (!serial) {
      return false;
    }

    return other.some(
      (value) =>
        this.normalizeSerial(value) === serial
    );
  }

  /**
   * Returns true when the serial is empty.
   */
  isEmptySerial(
    denom: 1000 | 500,
    index: number
  ): boolean {
    const arr =
      denom === 1000
        ? this.serials1000
        : this.serials500;

    return !this.normalizeSerial(arr[index]);
  }

  /**
   * Normalize serial number for comparisons.
   */
  private normalizeSerial(value: string | undefined): string {
    return (value ?? '')
      .trim()
      .toUpperCase();
  }

  /**
   * Validate all serial numbers.
   */
  validateSerials(): boolean {
    const errors: string[] = [];

    const row1000 = this.denominations.find(
      (d) => d.value === 1000
    )!;

    const row500 = this.denominations.find(
      (d) => d.value === 500
    )!;

    /*
    |--------------------------------------------------------------------------
    | ₱1,000 validation
    |--------------------------------------------------------------------------
    */

    if (row1000.qty > 0) {
      if (this.serials1000.length !== row1000.qty) {
        errors.push(
          `₱1,000 requires ${row1000.qty} serial number(s).`
        );
      }

      this.serials1000.forEach((serial, index) => {
        const normalized = this.normalizeSerial(serial);

        if (!normalized) {
          errors.push(
            `₱1,000 Bill #${index + 1} is missing a serial number.`
          );
        }
      });

      if (
        this.serials1000.some((_, index) =>
          this.isDuplicateSerial(1000, index)
        )
      ) {
        errors.push(
          'Duplicate ₱1,000 serial number detected.'
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ₱500 validation
    |--------------------------------------------------------------------------
    */

    if (row500.qty > 0) {
      if (this.serials500.length !== row500.qty) {
        errors.push(
          `₱500 requires ${row500.qty} serial number(s).`
        );
      }

      this.serials500.forEach((serial, index) => {
        const normalized = this.normalizeSerial(serial);

        if (!normalized) {
          errors.push(
            `₱500 Bill #${index + 1} is missing a serial number.`
          );
        }
      });

      if (
        this.serials500.some((_, index) =>
          this.isDuplicateSerial(500, index)
        )
      ) {
        errors.push(
          'Duplicate ₱500 serial number detected.'
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Cross-denomination validation
    |--------------------------------------------------------------------------
    */

    const crossDuplicate1000 = this.serials1000.find(
      (serial, index) =>
        this.isCrossDenominationDuplicate(1000, index)
    );

    const crossDuplicate500 = this.serials500.find(
      (serial, index) =>
        this.isCrossDenominationDuplicate(500, index)
    );

    if (crossDuplicate1000 || crossDuplicate500) {
      errors.push(
        'The same serial number cannot be used for both ₱1,000 and ₱500 bills.'
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Display first validation error
    |--------------------------------------------------------------------------
    */

    if (errors.length > 0) {
      this.errorMessage = errors[0];
      return false;
    }

    /*
    | Don't keep old serial errors around.
    */
    if (
      this.errorMessage?.includes('serial') ||
      this.errorMessage?.includes('Serial') ||
      this.errorMessage?.includes('₱1,000') ||
      this.errorMessage?.includes('₱500')
    ) {
      this.errorMessage = null;
    }

    return true;
  }

  /**
   * Determines whether Save Cash Count should be disabled.
   */
  get hasSerialValidationError(): boolean {
    const row1000 = this.denominations.find(
      (d) => d.value === 1000
    )!;

    const row500 = this.denominations.find(
      (d) => d.value === 500
    )!;

    // Missing serial numbers
    if (
      row1000.qty > 0 &&
      this.serials1000.some(
        (serial) => !this.normalizeSerial(serial)
      )
    ) {
      return true;
    }

    if (
      row500.qty > 0 &&
      this.serials500.some(
        (serial) => !this.normalizeSerial(serial)
      )
    ) {
      return true;
    }

    // Duplicate within denomination
    if (
      this.serials1000.some((_, index) =>
        this.isDuplicateSerial(1000, index)
      )
    ) {
      return true;
    }

    if (
      this.serials500.some((_, index) =>
        this.isDuplicateSerial(500, index)
      )
    ) {
      return true;
    }

    // Duplicate across denominations
    if (
      this.serials1000.some((_, index) =>
        this.isCrossDenominationDuplicate(1000, index)
      )
    ) {
      return true;
    }

    if (
      this.serials500.some((_, index) =>
        this.isCrossDenominationDuplicate(500, index)
      )
    ) {
      return true;
    }

    return false;
  }

  trackByIndex(index: number): number {
    return index;
  }

  get totalCash(): number {
    return this.denominations.reduce(
      (sum, d) => sum + d.value * d.qty,
      0
    );
  }

  get netCash(): number {
    return this.totalCash - (this.totalExpenses || 0);
  }

  submit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    /*
    |--------------------------------------------------------------------------
    | Validate serial numbers before submitting
    |--------------------------------------------------------------------------
    */

    if (!this.validateSerials()) {
      return;
    }

    const payload: CashCountPayload = {
      shift_number: this.shiftNumber,
      record_date: this.recordDate,
      crew_name: this.crewName || undefined,

      pieces_1000: this.denominations[0].qty,
      pieces_500: this.denominations[1].qty,
      pieces_100: this.denominations[2].qty,
      pieces_50: this.denominations[3].qty,
      pieces_20: this.denominations[4].qty,
      pieces_10: this.denominations[5].qty,
      pieces_5: this.denominations[6].qty,
      pieces_1: this.denominations[7].qty,

      serials_1000: this.serials1000.map(
        (serial) => this.normalizeSerial(serial)
      ),

      serials_500: this.serials500.map(
        (serial) => this.normalizeSerial(serial)
      ),

      total_expenses: this.totalExpenses || 0,
      notes: this.notes,
    };

    this.isSubmitting = true;

    this.cashCountService
      .submitCashCount(payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;

          this.router.navigate(['/summary'], {
            queryParams: {
              shift_number: this.shiftNumber,
              record_date: this.recordDate,
              crew_name: this.crewName,
            },
          });
        },

        error: (err) => {
          this.isSubmitting = false;

          const itemErrors = err?.error?.errors;

          if (
            Array.isArray(itemErrors)
          ) {
            this.errorMessage =
              itemErrors.flat().join(' | ');
          } else {
            this.errorMessage =
              err?.error?.message ??
              'Failed to save cash count.';
          }
        },
      });
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }
}