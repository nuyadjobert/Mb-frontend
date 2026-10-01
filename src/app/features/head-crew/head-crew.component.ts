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

  recordDate: string = new Date()
    .toISOString()
    .slice(0, 10);

  /**
   * Head Crew name.
   */
  checkedBy = '';

  records: InventoryRecord[] = [];

  isLoading = false;
  isChecking = false;
  isSavingEdit = false;

  checkingRecordId: number | null = null;

  errorMessage: string | null = null;
  successMessage: string | null = null;

  showEditModal = false;
  selectedRecord: InventoryRecord | null = null;

  editReason = '';

  editForm = {
    beginning_qty: 0,
    del_qty: 0,
    out_qty: 0,
    ending_qty: 0,
  };

  constructor(
    public authService: AuthService,
    private inventoryService: InventoryService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadRecords();
  }

  // =========================================================
  // LOAD RECORDS
  // =========================================================

  loadRecords(): void {
    this.isLoading = true;

    this.errorMessage = null;
    this.successMessage = null;

    this.inventoryService
      .getRecords(
        this.shiftNumber,
        this.recordDate
      )
      .subscribe({
        next: (res: any) => {
          this.records = res?.data ?? [];

          this.isLoading = false;
        },

        error: (err) => {
          this.isLoading = false;

          this.errorMessage =
            err?.error?.message ??
            'Failed to load submitted records.';
        },
      });
  }

  // =========================================================
  // STATUS
  // =========================================================

  get allPendingCount(): number {
    return this.records.filter(
      (record) => record.status === 'pending'
    ).length;
  }

  get allRecordsChecked(): boolean {
    return (
      this.records.length > 0 &&
      this.allPendingCount === 0
    );
  }

  get grandTotalSales(): number {
    return Math.round(
      this.records.reduce(
        (sum, record) =>
          sum + Number(record.total_sales ?? 0),
        0
      ) * 100
    ) / 100;
  }

  // =========================================================
  // CONFIRM ONE RECORD
  // =========================================================

  confirmRecord(record: InventoryRecord): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.isChecking) {
      return;
    }

    if (!this.checkedBy.trim()) {
      this.errorMessage =
        'Please enter your name before confirming this item.';
      return;
    }

    if (record.status === 'checked') {
      return;
    }

    if (!record.id) {
      this.errorMessage =
        'Unable to confirm this record because its ID is missing.';
      return;
    }

    this.checkingRecordId = record.id;
    this.isChecking = true;

    this.inventoryService
      .checkRecord(record.id, this.checkedBy.trim())
      .subscribe({
        next: (response: any) => {
          this.isChecking = false;
          this.checkingRecordId = null;

          if (response?.record) {
            const index = this.records.findIndex(
              (r) => r.id === record.id
            );

            if (index !== -1) {
              this.records[index] = response.record;
            }
          } else {
            record.status = 'checked';
            record.checked_by = this.checkedBy.trim();
            record.checked_at = new Date().toISOString();
          }

          this.successMessage =
            `${record.item?.name ?? 'Item'} has been confirmed.`;

          this.focusNextPendingRecord(record);
        },

        error: (err) => {
          this.isChecking = false;
          this.checkingRecordId = null;

          this.errorMessage =
            err?.error?.message ??
            'Failed to confirm this inventory record.';
        },
      });
  }

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  editRecord(
    record: InventoryRecord
  ): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!record.id) {
      this.errorMessage =
        'Unable to edit this record because its ID is missing.';
      return;
    }

    this.selectedRecord = record;

    this.editForm = {
      beginning_qty:
        Number(record.beginning_qty ?? 0),

      del_qty:
        Number(record.del_qty ?? 0),

      out_qty:
        Number(record.out_qty ?? 0),

      ending_qty:
        Number(record.ending_qty ?? 0),
    };

    this.editReason = '';

    this.showEditModal = true;
  }

  // =========================================================
  // CLOSE EDIT MODAL
  // =========================================================

  closeEditModal(): void {
    if (this.isSavingEdit) {
      return;
    }

    this.showEditModal = false;

    this.selectedRecord = null;

    this.editReason = '';

    this.editForm = {
      beginning_qty: 0,
      del_qty: 0,
      out_qty: 0,
      ending_qty: 0,
    };
  }

  // =========================================================
  // SAVE EDIT + CONFIRM
  // =========================================================

  saveEdit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.selectedRecord) {
      this.errorMessage =
        'No inventory record is selected for editing.';
      return;
    }

    if (!this.checkedBy.trim()) {
      this.errorMessage =
        'Please enter your name before saving an edit.';
      return;
    }

    if (!this.editReason.trim()) {
      this.errorMessage =
        'Please provide a reason for editing this item.';
      return;
    }

    const beginning =
      Number(this.editForm.beginning_qty);

    const delivery =
      Number(this.editForm.del_qty);

    const out =
      Number(this.editForm.out_qty);

    const ending =
      Number(this.editForm.ending_qty);

    if (
      !Number.isFinite(beginning) ||
      !Number.isFinite(delivery) ||
      !Number.isFinite(out) ||
      !Number.isFinite(ending)
    ) {
      this.errorMessage =
        'Please enter valid quantity values.';
      return;
    }

    if (
      beginning < 0 ||
      delivery < 0 ||
      out < 0 ||
      ending < 0
    ) {
      this.errorMessage =
        'Quantity values cannot be negative.';
      return;
    }

    const availableQuantity =
      beginning + delivery;

    if (ending > availableQuantity) {
      this.errorMessage =
        'Ending quantity cannot be greater than the available quantity.';
      return;
    }

    const usage =
      beginning +
      delivery -
      out -
      ending;

    if (usage < 0) {
      this.errorMessage =
        'The calculated usage cannot be negative. Please check the quantities.';
      return;
    }

    const recordId =
      this.selectedRecord.id;

    this.isSavingEdit = true;

    this.inventoryService
      .editAndCheckRecord(
        recordId,
        {
          beginning_qty: beginning,
          del_qty: delivery,
          out_qty: out,
          ending_qty: ending,
          reason: this.editReason.trim(),
          checked_by: this.checkedBy.trim(),
        }
      )
      .subscribe({
        next: (response: any) => {
          const index =
            this.records.findIndex(
              (r) => r.id === recordId
            );

          if (
            index !== -1 &&
            response?.record
          ) {
            this.records[index] =
              response.record;
          }

          this.isSavingEdit = false;

          this.showEditModal = false;

          const itemName =
            this.selectedRecord?.item?.name ??
            'Item';

          this.selectedRecord = null;

          this.editReason = '';

          this.successMessage =
            `${itemName} has been updated and confirmed.`;

          this.focusNextPendingRecord(
            this.records[index]
          );
        },

        error: (err) => {
          this.isSavingEdit = false;

          const validationErrors =
            err?.error?.errors;

          if (
            validationErrors &&
            typeof validationErrors === 'object'
          ) {
            const messages =
              Object.values(validationErrors)
                .flat()
                .map((message) => String(message));

            this.errorMessage =
              messages.join(' | ');
          } else {
            this.errorMessage =
              err?.error?.message ??
              'Failed to update this inventory record.';
          }
        },
      });
  }

  // =========================================================
  // EDIT PREVIEW
  // =========================================================

  get editUsage(): number {
    return (
      Number(this.editForm.beginning_qty) +
      Number(this.editForm.del_qty) -
      Number(this.editForm.out_qty) -
      Number(this.editForm.ending_qty)
    );
  }

  get editTotalSales(): number {
    if (!this.selectedRecord) {
      return 0;
    }

    const divisor =
      Number(
        this.selectedRecord.item?.divisor ?? 1
      );

    const price =
      Number(
        this.selectedRecord.item?.price ?? 0
      );

    if (divisor <= 0) {
      return 0;
    }

    return (
      this.editUsage /
      divisor
    ) * price;
  }

  // =========================================================
  // AUTO FOCUS NEXT ITEM
  // =========================================================

  private focusNextPendingRecord(
    currentRecord: InventoryRecord
  ): void {
    if (!currentRecord) {
      return;
    }

    const currentIndex =
      this.records.findIndex(
        (record) =>
          record.id === currentRecord.id
      );

    if (currentIndex === -1) {
      return;
    }

    const nextRecord =
      this.records
        .slice(currentIndex + 1)
        .find(
          (record) =>
            record.status === 'pending'
        );

    if (!nextRecord) {
      return;
    }

    setTimeout(() => {
      const element =
        document.getElementById(
          `record-${nextRecord.id}`
        );

      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  }

  // =========================================================
  // PROCEED TO EXISTING CASH COUNT
  // =========================================================

  // =========================================================
  // PROCEED TO HEAD CREW CASH COUNT REVIEW
  // =========================================================

  proceedToCashCount(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.allRecordsChecked) {
      this.errorMessage =
        'Please confirm all inventory items before reviewing the Cash Count.';
      return;
    }

    if (!this.checkedBy.trim()) {
      this.errorMessage =
        'Please enter your name before reviewing the Cash Count.';
      return;
    }

    this.router.navigate(
      ['/head-crew/cash-count'],
      {
        queryParams: {
          shift_number: this.shiftNumber,
          record_date: this.recordDate,
          crew_name: this.checkedBy.trim(),
        },
      }
    );
  }
  // =========================================================
  // LOGOUT
  // =========================================================

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },

      error: () => {
        this.router.navigate(['/']);
      },
    });
  }
}