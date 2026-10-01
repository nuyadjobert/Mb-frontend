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
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {

  shiftNumber: 1 | 2 | 3 = 1;
  recordDate: string = this.today();
  crewName = '';

  // Current shift
  rows: Row[] = [];

  // Previous shift
  previousShift: 1 | 2 | null = null;
  previousShiftRows: Row[] = [];
  previousShiftCrewName = '';
  previousShiftTotalSales = 0;

  isLoading = false;
  isSubmitting = false;

  /**
   * TRUE when the currently selected shift
   * already has a submitted record.
   *
   * When true:
   * - inputs are disabled
   * - correction controls are disabled/hidden
   * - submit button is hidden
   * - shift becomes read-only
   */
  shiftSubmitted = false;

  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    public authService: AuthService,
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {

      const shiftParam =
        params.get('shift_number');

      const dateParam =
        params.get('record_date');

      if (shiftParam) {
        const shift = Number(shiftParam);

        if (shift >= 1 && shift <= 3) {
          this.shiftNumber =
            shift as 1 | 2 | 3;
        }
      }

      if (dateParam) {
        this.recordDate = dateParam;
      }

      this.loadShift();
    });
  }

  today(): string {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  /**
   * Load the CURRENT shift.
   */
  loadShift(): void {

    this.isLoading = true;

    this.errorMessage = null;
    this.successMessage = null;

    // Reset submitted state while loading
    this.shiftSubmitted = false;

    // Clear previous shift while loading
    this.previousShiftRows = [];
    this.previousShiftCrewName = '';
    this.previousShiftTotalSales = 0;

    this.inventoryService
      .getShiftPreview(
        this.shiftNumber,
        this.recordDate
      )
      .subscribe({

        next: (res) => {

          /**
           * IMPORTANT:
           *
           * If ANY item has an existing record,
           * this shift has already been submitted.
           *
           * We do NOT use crew_name for this check
           * because an existing record is the actual
           * indication that the shift was saved.
           */
          this.shiftSubmitted =
            res.items.some(
              (item) =>
                !!item.existing_record
            );

          this.rows =
            res.items.map((item) => {

              const existing =
                item.existing_record;

              const row: Row = {

                item_id:
                  item.item_id,

                item_name:
                  item.item_name,

                unit:
                  item.unit,

                price:
                  Number(item.price),

                divisor:
                  Number(item.divisor),

                beginning_qty:
                  Number(item.beginning_qty),

                beginning_qty_auto:
                  Number(item.beginning_qty),

                beginning_override_reason:
                  existing?.beginning_override_reason ?? '',

                beginning_editing:
                  false,

                beginning_correction_confirmed:
                  !!existing?.beginning_override_reason,

                del_qty:
                  Number(existing?.del_qty ?? 0),

                out_qty:
                  Number(existing?.out_qty ?? 0),

                ending_qty:
                  existing?.ending_qty !== undefined &&
                    existing?.ending_qty !== null
                    ? Number(existing.ending_qty)
                    : null,

                usage_qty:
                  0,

                total_order:
                  0,

                total_sales:
                  0,

                is_divisible:
                  true,

                divisibility_error:
                  null,

                ending_qty_error:
                  null,
              };

              this.recalculateRow(row);

              return row;
            });

          /**
           * Get crew name from existing submitted record.
           */
          const alreadySubmitted =
            res.items.find(
              (item) =>
                item.existing_record?.crew_name
            );

          if (
            alreadySubmitted
              ?.existing_record
              ?.crew_name
          ) {
            this.crewName =
              alreadySubmitted
                .existing_record
                .crew_name;
          }

          // Load previous shift as read-only
          this.loadPreviousShift();

          this.isLoading = false;
        },

        error: () => {

          this.errorMessage =
            'Failed to load shift data.';

          this.isLoading = false;
          this.shiftSubmitted = false;
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
   *   Show Shift 1.
   *
   * Shift 3:
   *   Show Shift 2.
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

          this.previousShiftRows =
            res.items
              .filter(
                (item) =>
                  item.existing_record
              )
              .map((item) => {

                const record =
                  item.existing_record!;

                return {

                  item_id:
                    item.item_id,

                  item_name:
                    item.item_name,

                  unit:
                    item.unit,

                  price:
                    Number(item.price),

                  divisor:
                    Number(item.divisor),

                  beginning_qty:
                    Number(
                      record.beginning_qty
                    ),

                  beginning_qty_auto:
                    Number(
                      record.beginning_qty
                    ),

                  beginning_override_reason:
                    record.beginning_override_reason ??
                    '',

                  beginning_editing:
                    false,

                  beginning_correction_confirmed:
                    !!record.beginning_override_reason,

                  del_qty:
                    Number(
                      record.del_qty ?? 0
                    ),

                  out_qty:
                    Number(
                      record.out_qty ?? 0
                    ),

                  ending_qty:
                    Number(
                      record.ending_qty
                    ),

                  usage_qty:
                    Number(
                      record.usage_qty ?? 0
                    ),

                  total_order:
                    Number(
                      record.total_order ?? 0
                    ),

                  total_sales:
                    Number(
                      record.total_sales ?? 0
                    ),

                  is_divisible:
                    true,

                  divisibility_error:
                    null,

                  ending_qty_error:
                    null,
                };
              });

          const firstRecord =
            res.items.find(
              (item) =>
                item.existing_record
            );

          if (
            firstRecord
              ?.existing_record
              ?.crew_name
          ) {
            this.previousShiftCrewName =
              firstRecord
                .existing_record
                .crew_name;
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

          // Previous shift failure
          // should not block current shift.
          this.previousShiftRows = [];
        },
      });
  }

  /**
   * True if Beginning was changed
   * from the system-calculated value.
   */
  isBeginningOverridden(
    row: Row
  ): boolean {

    return (
      Math.abs(
        row.beginning_qty -
        row.beginning_qty_auto
      ) > 0.001
    );
  }

  /**
   * Called whenever Beginning changes.
   */
  onBeginningChange(
    row: Row
  ): void {

    // Extra protection.
    // Submitted shifts should never
    // be modified.
    if (this.shiftSubmitted) {
      return;
    }

    if (
      this.isBeginningOverridden(row)
    ) {

      row.beginning_editing = true;

      row.beginning_correction_confirmed =
        false;

    } else {

      // User returned Beginning
      // to automatic value.
      row.beginning_override_reason =
        '';

      row.beginning_editing =
        false;

      row.beginning_correction_confirmed =
        false;
    }

    this.recalculateRow(row);
  }

  /**
   * Open an existing correction.
   */
  startBeginningCorrection(
    row: Row
  ): void {

    // Never allow editing
    // of a submitted shift.
    if (this.shiftSubmitted) {
      return;
    }

    row.beginning_editing = true;
  }

  /**
   * Confirm Beginning correction.
   */
  confirmBeginningCorrection(
    row: Row
  ): void {

    // Never allow modification
    // of a submitted shift.
    if (this.shiftSubmitted) {
      return;
    }

    const reason =
      row.beginning_override_reason
        .trim();

    if (!reason) {
      return;
    }

    row.beginning_override_reason =
      reason;

    row.beginning_editing =
      false;

    row.beginning_correction_confirmed =
      true;

    this.recalculateRow(row);
  }

  /**
   * Cancel Beginning correction.
   */
  cancelBeginningCorrection(
    row: Row
  ): void {

    // Never allow modification
    // of a submitted shift.
    if (this.shiftSubmitted) {
      return;
    }

    row.beginning_qty =
      row.beginning_qty_auto;

    row.beginning_override_reason =
      '';

    row.beginning_editing =
      false;

    row.beginning_correction_confirmed =
      false;

    this.recalculateRow(row);
  }

  /**
   * Reset Beginning.
   */
  resetBeginning(
    row: Row
  ): void {

    // Never allow modification
    // of a submitted shift.
    if (this.shiftSubmitted) {
      return;
    }

    row.beginning_qty =
      row.beginning_qty_auto;

    row.beginning_override_reason =
      '';

    row.beginning_editing =
      false;

    row.beginning_correction_confirmed =
      false;

    this.recalculateRow(row);
  }

  /**
   * Recalculate usage,
   * total order and total sales.
   */
  recalculateRow(
    row: Row
  ): void {

    // Validate Ending Qty
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
      Math.round(
        usage * 100
      ) / 100;

    row.total_order =
      Math.round(
        totalOrder * 100
      ) / 100;

    row.total_sales =
      Math.round(
        totalOrder *
        row.price *
        100
      ) / 100;

    // Reset divisibility
    row.is_divisible =
      true;

    row.divisibility_error =
      null;

    // Don't check if Ending is empty
    if (
      row.ending_qty === null
    ) {
      return;
    }

    // Check Usage divisibility
    const remainder =
      Math.abs(
        row.usage_qty %
        divisor
      );

    if (
      remainder > 0.000001
    ) {

      row.is_divisible =
        false;

      row.divisibility_error =
        `Usage quantity (${row.usage_qty}) is not divisible by ${divisor}.`;
    }
  }

  /**
   * Validate Ending Qty.
   *
   * Rules:
   * - Ending cannot be less than 0.
   * - Ending cannot be greater than Beginning.
   */
  validateEndingQty(
    row: Row
  ): void {

    row.ending_qty_error =
      null;

    if (
      row.ending_qty === null ||
      row.ending_qty === undefined
    ) {
      return;
    }

    if (
      row.ending_qty < 0
    ) {

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

  /**
   * Calculate current shift
   * total sales.
   */
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
   * Determines whether the current shift
   * is ready to be submitted.
   */
  get canSubmit(): boolean {

    if (this.shiftSubmitted) {
      return false;
    }

    if (!this.crewName.trim()) {
      return false;
    }

    if (!this.rows.length) {
      return false;
    }

    for (const row of this.rows) {

      if (
        row.ending_qty === null ||
        row.ending_qty === undefined
      ) {
        return false;
      }

      if (row.ending_qty_error !== null) {
        return false;
      }

      if (!row.is_divisible) {
        return false;
      }

      if (
        row.beginning_editing &&
        this.isBeginningOverridden(row)
      ) {
        return false;
      }

      if (
        this.isBeginningOverridden(row) &&
        !row.beginning_override_reason.trim()
      ) {
        return false;
      }
    }

    return true;
  }



  /**
   * Submit CURRENT shift.
   */
  submitShift(): void {

    /**
     * IMPORTANT:
     *
     * Prevent submitting an already
     * completed shift even if this
     * method is triggered manually.
     */
    if (this.shiftSubmitted) {

      this.errorMessage =
        `Shift ${this.shiftNumber} has already been submitted and cannot be edited.`;

      return;
    }

    this.errorMessage = null;
    this.successMessage = null;

    // Crew name required
    if (!this.crewName.trim()) {

      this.errorMessage =
        'Please enter the crew name before submitting.';

      return;
    }

    // Check unfinished Beginning correction
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

    // Check missing Ending Qty
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

    // Check Ending range
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

    // Beginning override requires reason
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

      items:
        this.rows.map(
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

    this.isSubmitting =
      true;

    this.inventoryService
      .submitShift(payload)
      .subscribe({

        next: (res) => {

          this.isSubmitting =
            false;

          /**
           * After successful submission,
           * immediately mark the current
           * shift as submitted.
           */
          this.shiftSubmitted =
            true;

          /**
           * Continue your existing flow:
           * go to Cash Count.
           */
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

          this.isSubmitting =
            false;

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

  /**
   * Logout.
   */
  logout(): void {

    this.authService
      .logout()
      .subscribe({

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
