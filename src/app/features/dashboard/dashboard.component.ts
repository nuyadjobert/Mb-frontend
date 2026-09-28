import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  beginning_qty_auto: number;
  beginning_override_reason: string;

  beginning_editing: boolean;
  beginning_correction_confirmed: boolean;

  del_qty: number;
  out_qty: number;
  ending_qty: number | null;

  usage_qty: number;
  total_order: number;
  total_sales: number;

  is_divisible: boolean;
  divisibility_error: string | null;

  ending_qty_error: string | null;
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

  // Current shift - editable
  rows: Row[] = [];

  // Previous shift - read only
  previousShift: 1 | 2 | null = null;
  previousShiftRows: Row[] = [];
  previousShiftCrewName = '';
  previousShiftTotalSales = 0;

  isLoading = false;
  isSubmitting = false;

  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    public authService: AuthService,
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const shiftParam = params.get('shift_number');
      const dateParam = params.get('record_date');

      if (shiftParam) {
        const shift = Number(shiftParam);

        if (shift >= 1 && shift <= 3) {
          this.shiftNumber = shift as 1 | 2 | 3;
        }
      }

      if (dateParam) {
        this.recordDate = dateParam;
      }

      this.loadShift();
    });
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Load the CURRENT shift.
   *
   * This is the shift that the crew is currently working on
   * and is therefore editable.
   */
  loadShift(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Clear previous shift while loading
    this.previousShiftRows = [];
    this.previousShiftCrewName = '';
    this.previousShiftTotalSales = 0;

    this.inventoryService
      .getShiftPreview(this.shiftNumber, this.recordDate)
      .subscribe({
        next: (res) => {
          this.rows = res.items.map((item) => {
            const existing = item.existing_record;

            const row: Row = {
              item_id: item.item_id,
              item_name: item.item_name,
              unit: item.unit,
              price: Number(item.price),
              divisor: Number(item.divisor),

              beginning_qty: Number(item.beginning_qty),
              beginning_qty_auto: Number(item.beginning_qty),

              beginning_override_reason:
                existing?.beginning_override_reason ?? '',

              beginning_editing: false,

              beginning_correction_confirmed:
                !!existing?.beginning_override_reason,

              del_qty: Number(existing?.del_qty ?? 0),
              out_qty: Number(existing?.out_qty ?? 0),
              ending_qty:
                existing?.ending_qty !== undefined &&
                existing?.ending_qty !== null
                  ? Number(existing.ending_qty)
                  : null,

              usage_qty: 0,
              total_order: 0,
              total_sales: 0,

              is_divisible: true,
              divisibility_error: null,

              ending_qty_error: null,
            };

            this.recalculateRow(row);

            return row;
          });

          const alreadySubmitted = res.items.find(
            (item) => item.existing_record?.crew_name
          );

          if (alreadySubmitted?.existing_record?.crew_name) {
            this.crewName =
              alreadySubmitted.existing_record.crew_name;
          }

          // Load previous shift as read-only
          this.loadPreviousShift();

          this.isLoading = false;
        },

        error: () => {
          this.errorMessage =
            'Failed to load shift data.';

          this.isLoading = false;
        },
      });
  }

  /**
   * Load the previous shift for display only.
   *
   * Shift 1:
   *   No previous shift.
   *
   * Shift 2:
   *   Show Shift 1 as read-only.
   *
   * Shift 3:
   *   Show Shift 2 as read-only.
   */
  loadPreviousShift(): void {
    this.previousShiftRows = [];
    this.previousShiftCrewName = '';
    this.previousShiftTotalSales = 0;

    // Shift 1 has no previous shift
    if (this.shiftNumber === 1) {
      this.previousShift = null;
      return;
    }

    this.previousShift =
      (this.shiftNumber - 1) as 1 | 2;

    this.inventoryService
      .getShiftPreview(
        this.previousShift,
        this.recordDate
      )
      .subscribe({
        next: (res) => {
          this.previousShiftRows = res.items
            .filter((item) => item.existing_record)
            .map((item) => {
              const record =
                item.existing_record!;

              return {
                item_id: item.item_id,
                item_name: item.item_name,
                unit: item.unit,
                price: Number(item.price),
                divisor: Number(item.divisor),

                beginning_qty:
                  Number(record.beginning_qty),

                beginning_qty_auto:
                  Number(record.beginning_qty),

                beginning_override_reason:
                  record.beginning_override_reason ?? '',

                // Previous shift is read-only
                beginning_editing: false,

                beginning_correction_confirmed:
                  !!record.beginning_override_reason,

                del_qty:
                  Number(record.del_qty ?? 0),

                out_qty:
                  Number(record.out_qty ?? 0),

                ending_qty:
                  Number(record.ending_qty),

                usage_qty:
                  Number(record.usage_qty ?? 0),

                total_order:
                  Number(record.total_order ?? 0),

                total_sales:
                  Number(record.total_sales ?? 0),

                is_divisible: true,
                divisibility_error: null,

                ending_qty_error: null,
              };
            });

          const firstRecord = res.items.find(
            (item) => item.existing_record
          );

          if (
            firstRecord?.existing_record?.crew_name
          ) {
            this.previousShiftCrewName =
              firstRecord.existing_record.crew_name;
          }

          this.previousShiftTotalSales =
            Math.round(
              this.previousShiftRows.reduce(
                (sum, row) =>
                  sum + row.total_sales,
                0
              ) * 100
            ) / 100;
        },

        error: () => {
          // Do not block the current shift
          // if previous shift preview fails.
          this.previousShiftRows = [];
        },
      });
  }

  /**
   * True if Beginning was changed from
   * the system-calculated value.
   */
  isBeginningOverridden(row: Row): boolean {
    return (
      Math.abs(
        row.beginning_qty -
          row.beginning_qty_auto
      ) > 0.001
    );
  }

  /**
   * Called whenever Beginning is changed.
   *
   * If Beginning differs from the automatic value,
   * open the correction note area.
   */
  onBeginningChange(row: Row): void {
    if (this.isBeginningOverridden(row)) {
      row.beginning_editing = true;
      row.beginning_correction_confirmed = false;
    } else {
      // User returned Beginning to automatic value.
      row.beginning_override_reason = '';
      row.beginning_editing = false;
      row.beginning_correction_confirmed = false;
    }

    this.recalculateRow(row);
  }

  /**
   * Open an existing correction for editing.
   */
  startBeginningCorrection(row: Row): void {
    row.beginning_editing = true;
  }

  /**
   * Confirm the Beginning correction.
   *
   * A reason is required.
   */
  confirmBeginningCorrection(row: Row): void {
    const reason =
      row.beginning_override_reason.trim();

    if (!reason) {
      return;
    }

    row.beginning_override_reason = reason;

    row.beginning_editing = false;
    row.beginning_correction_confirmed = true;

    this.recalculateRow(row);
  }

  /**
   * Cancel the Beginning correction.
   *
   * Restore the automatic Beginning quantity
   * and remove the correction note.
   */
  cancelBeginningCorrection(row: Row): void {
    row.beginning_qty =
      row.beginning_qty_auto;

    row.beginning_override_reason = '';

    row.beginning_editing = false;
    row.beginning_correction_confirmed = false;

    this.recalculateRow(row);
  }

  /**
   * Reset Beginning back to automatic value.
   */
  resetBeginning(row: Row): void {
    row.beginning_qty =
      row.beginning_qty_auto;

    row.beginning_override_reason = '';

    row.beginning_editing = false;
    row.beginning_correction_confirmed = false;

    this.recalculateRow(row);
  }

  /**
   * Recalculate usage, total order
   * and total sales.
   *
   * Also performs:
   * - Ending quantity validation
   * - Divisibility validation
   */
  recalculateRow(row: Row): void {
    // Validate Ending Qty immediately
    this.validateEndingQty(row);

    const ending =
      row.ending_qty ?? 0;

    const usage =
      row.beginning_qty +
      row.del_qty -
      row.out_qty -
      ending;

    const divisor =
      row.divisor > 0
        ? row.divisor
        : 1;

    const totalOrder =
      usage / divisor;

    row.usage_qty =
      Math.round(usage * 100) / 100;

    row.total_order =
      Math.round(totalOrder * 100) / 100;

    row.total_sales =
      Math.round(
        totalOrder *
          row.price *
          100
      ) / 100;

    // Reset divisibility validation
    row.is_divisible = true;
    row.divisibility_error = null;

    // Don't check divisibility if Ending is empty
    if (row.ending_qty === null) {
      return;
    }

    // Check if Usage is divisible by divisor
    const remainder =
      Math.abs(
        row.usage_qty % divisor
      );

    if (remainder > 0.000001) {
      row.is_divisible = false;

      row.divisibility_error =
        `Usage quantity (${row.usage_qty}) is not divisible by ${divisor}.`;
    }
  }

  /**
   * Validate Ending Qty immediately.
   *
   * Rules:
   * - Ending cannot be less than 0.
   * - Ending cannot be greater than Beginning.
   */
  validateEndingQty(row: Row): void {
    row.ending_qty_error = null;

    if (
      row.ending_qty === null ||
      row.ending_qty === undefined
    ) {
      return;
    }

    if (row.ending_qty < 0) {
      row.ending_qty_error =
        'Ending quantity cannot be less than 0.';
      return;
    }

    if (
      row.ending_qty >
      row.beginning_qty
    ) {
      row.ending_qty_error =
        `Ending quantity cannot be greater than Beginning quantity (${row.beginning_qty}).`;
      return;
    }
  }

  get grandTotalSales(): number {
    return Math.round(
      this.rows.reduce(
        (sum, row) =>
          sum + row.total_sales,
        0
      ) * 100
    ) / 100;
  }

  /**
   * Submit the CURRENT shift.
   */
  submitShift(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.crewName.trim()) {
      this.errorMessage =
        'Please enter the crew name before submitting.';
      return;
    }

    // Make sure there is no correction
    // currently waiting for Done/Cancel.
    const unfinishedCorrection =
      this.rows.find(
        (row) =>
          row.beginning_editing &&
          this.isBeginningOverridden(row)
      );

    if (unfinishedCorrection) {
      this.errorMessage =
        `Please click Done or Cancel for the Beginning correction of "${unfinishedCorrection.item_name}".`;
      return;
    }

    // Check for missing Ending Qty
    const incompleteRow =
      this.rows.find(
        (row) =>
          row.ending_qty === null
      );

    if (incompleteRow) {
      this.errorMessage =
        `Please enter the Ending qty for "${incompleteRow.item_name}".`;
      return;
    }

    // Check Ending Qty range
    const invalidEndingRow =
      this.rows.find(
        (row) =>
          row.ending_qty_error !== null
      );

    if (invalidEndingRow) {
      this.errorMessage =
        `"${invalidEndingRow.item_name}": ${invalidEndingRow.ending_qty_error}`;
      return;
    }

    // Check divisibility
    const invalidRow =
      this.rows.find(
        (row) =>
          !row.is_divisible
      );

    if (invalidRow) {
      this.errorMessage =
        `"${invalidRow.item_name}": ${invalidRow.divisibility_error}`;
      return;
    }

    // Beginning override requires a reason
    const missingReason =
      this.rows.find(
        (row) =>
          this.isBeginningOverridden(row) &&
          !row.beginning_override_reason.trim()
      );

    if (missingReason) {
      this.errorMessage =
        `Please provide a reason for overriding the Beginning qty of "${missingReason.item_name}".`;
      return;
    }

    const payload: BulkSubmitPayload = {
      shift_number:
        this.shiftNumber,

      record_date:
        this.recordDate,

      crew_name:
        this.crewName.trim(),

      items: this.rows.map(
        (row) => ({
          item_id:
            row.item_id,

          beginning_qty:
            row.beginning_qty,

          beginning_override_reason:
            this.isBeginningOverridden(row)
              ? row.beginning_override_reason.trim()
              : null,

          del_qty:
            row.del_qty,

          out_qty:
            row.out_qty,

          ending_qty:
            row.ending_qty as number,
        })
      ),
    };

    this.isSubmitting = true;

    this.inventoryService
      .submitShift(payload)
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;

          this.router.navigate(
            ['/cash-count'],
            {
              queryParams: {
                shift_number:
                  res.shift_number,

                record_date:
                  res.record_date,

                crew_name:
                  res.crew_name,
              },
            }
          );
        },

        error: (err) => {
          this.isSubmitting = false;

          const itemErrors =
            err?.error?.errors;

          this.errorMessage =
            Array.isArray(itemErrors) &&
            itemErrors.length
              ? itemErrors.join(' | ')
              : err?.error?.message ??
                'Failed to submit shift.';
        },
      });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () =>
        this.router.navigate(
          ['/login']
        ),

      error: () =>
        this.router.navigate(
          ['/login']
        ),
    });
  }
}