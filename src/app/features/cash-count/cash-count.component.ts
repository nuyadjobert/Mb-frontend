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

    if (shiftParam) this.shiftNumber = Number(shiftParam) as 1 | 2 | 3;
    if (dateParam) this.recordDate = dateParam;
    if (crewParam) this.crewName = crewParam;

    this.loadExisting();
  }

  loadExisting(): void {
    this.isLoading = true;

    this.cashCountService.getCashCount(this.shiftNumber, this.recordDate).subscribe({
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
          this.totalExpenses = Number(existing.total_expenses ?? 0);
          this.notes = existing.notes ?? '';
          this.crewName = existing.crew_name ?? this.crewName;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  onQtyChange(row: DenomRow): void {
    if (row.qty < 0) row.qty = 0;
    if (row.value === 1000) this.resizeSerials(1000);
    if (row.value === 500) this.resizeSerials(500);
  }

  private resizeSerials(denom: 1000 | 500): void {
    const row = this.denominations.find((d) => d.value === denom)!;
    const arr = denom === 1000 ? this.serials1000 : this.serials500;

    while (arr.length < row.qty) arr.push('');
    while (arr.length > row.qty) arr.pop();
  }

  trackByIndex(index: number): number {
    return index;
  }

  get totalCash(): number {
    return this.denominations.reduce((sum, d) => sum + d.value * d.qty, 0);
  }

  get netCash(): number {
    return this.totalCash - (this.totalExpenses || 0);
  }

  submit(): void {
    this.errorMessage = null;
    this.successMessage = null;

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
      serials_1000: this.serials1000,
      serials_500: this.serials500,
      total_expenses: this.totalExpenses || 0,
      notes: this.notes,
    };

    this.isSubmitting = true;

    this.cashCountService.submitCashCount(payload).subscribe({
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
        this.errorMessage = err?.error?.message ?? 'Failed to save cash count.';
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