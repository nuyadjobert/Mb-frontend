import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { CashCountService } from '../../core/services/cash-count.service';

import {
  CashCountReviewResponse,
} from '../../core/models/api.models';

@Component({
  selector: 'app-head-crew-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './head-crew-summary.component.html',
})
export class HeadCrewSummaryComponent implements OnInit {
  readonly Number = Number;

  shiftNumber: 1 | 2 | 3 = 1;
  recordDate = new Date().toISOString().slice(0, 10);

  review: CashCountReviewResponse | null = null;

  isLoading = false;
  errorMessage: string | null = null;

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

    if (shiftParam) {
      this.shiftNumber = Number(shiftParam) as 1 | 2 | 3;
    }

    if (dateParam) {
      this.recordDate = dateParam;
    }

    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.cashCountService
      .getReview(this.shiftNumber, this.recordDate)
      .subscribe({
        next: (response) => {
          this.review = response;
          this.isLoading = false;
        },

        error: (err) => {
          this.review = null;
          this.isLoading = false;

          this.errorMessage =
            err?.error?.message ??
            'Unable to load the shift summary.';
        },
      });
  }

  get totalSales(): number {
    return Number(this.review?.total_sales ?? 0);
  }

  get totalExpenses(): number {
    if (!this.review) {
      return 0;
    }

    return Number(
      this.review.reviewed_expenses ??
      this.review.cash_count?.reviewed_expenses ??
      this.review.cash_count?.total_expenses ??
      0
    );
  }

  get totalCashCount(): number {
    return Number(
      this.review?.actual_cash ??
      this.review?.cash_count?.total_cash ??
      0
    );
  }

  get expectedCash(): number {
    return Math.round(
      (this.totalSales - this.totalExpenses) * 100
    ) / 100;
  }

  get variance(): number {
    return Math.round(
      (this.totalCashCount - this.expectedCash) * 100
    ) / 100;
  }

  get varianceStatus(): 'SHORT' | 'EXACT' | 'OVER' {
    const value = this.variance;

    if (Math.abs(value) < 0.01) {
      return 'EXACT';
    }

    return value < 0 ? 'SHORT' : 'OVER';
  }

  get varianceStatusLabel(): string {
    switch (this.varianceStatus) {
      case 'SHORT':
        return 'SHORT';

      case 'OVER':
        return 'OVER';

      default:
        return 'EXACT';
    }
  }

  get varianceDescription(): string {
    switch (this.varianceStatus) {
      case 'SHORT':
        return 'The actual cash is less than the expected cash.';

      case 'OVER':
        return 'The actual cash is greater than the expected cash.';

      default:
        return 'The actual cash matches the expected cash.';
    }
  }

  get reviewedBy(): string {
    return this.review?.cash_count?.reviewed_by ?? '-';
  }

  get reviewNotes(): string {
    return this.review?.cash_count?.review_notes ?? '';
  }

  backToCashCount(): void {
    this.router.navigate(['/head-crew/cash-count'], {
      queryParams: {
        shift_number: this.shiftNumber,
        record_date: this.recordDate,
      },
    });
  }

  continueToNextShift(): void {
    let nextShift: 1 | 2 | 3;
    let nextDate = this.recordDate;

    if (this.shiftNumber === 1) {
      nextShift = 2;
    } else if (this.shiftNumber === 2) {
      nextShift = 3;
    } else {
      nextShift = 1;

      const date = new Date(
        `${this.recordDate}T00:00:00`
      );

      date.setDate(date.getDate() + 1);

      nextDate = date.toISOString().slice(0, 10);
    }

    this.router.navigate(['/head-crew'], {
      queryParams: {
        shift_number: nextShift,
        record_date: nextDate,
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
