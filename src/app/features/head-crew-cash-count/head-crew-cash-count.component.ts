import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { CashCountService } from '../../core/services/cash-count.service';

import {
    CashCountReviewResponse,
} from '../../core/models/api.models';

@Component({
    selector: 'app-head-crew-cash-count',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './head-crew-cash-count.component.html',
})
export class HeadCrewCashCountComponent implements OnInit {
    readonly Number = Number;
    shiftNumber: 1 | 2 | 3 = 1;
    recordDate = new Date().toISOString().slice(0, 10);

    // Head Crew name
    checkedBy = '';

    review: CashCountReviewResponse | null = null;

    // Head Crew can review/update these
    reviewedExpenses = 0;
    reviewNotes = '';

    isLoading = false;
    isSaving = false;

    errorMessage: string | null = null;
    successMessage: string | null = null;

    constructor(
        public authService: AuthService,
        private cashCountService: CashCountService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        const qp = this.route.snapshot.queryParamMap;

        const shiftParam = qp.get('shift_number');
        const dateParam = qp.get('record_date');
        const crewParam = qp.get('crew_name');

        if (shiftParam) {
            const shift = Number(shiftParam);

            if (shift === 1 || shift === 2 || shift === 3) {
                this.shiftNumber = shift;
            }
        }

        if (dateParam) {
            this.recordDate = dateParam;
        }

        if (crewParam) {
            this.checkedBy = crewParam;
        }

        this.loadReview();
    }

    loadReview(): void {
        this.isLoading = true;
        this.errorMessage = null;
        this.successMessage = null;

        this.cashCountService
            .getReview(
                this.shiftNumber,
                this.recordDate
            )
            .subscribe({
                next: (response) => {
                    this.review = response;

                    this.reviewedExpenses =
                        Number(
                            response.reviewed_expenses ??
                            response.cash_count?.total_expenses ??
                            0
                        );

                    this.reviewNotes =
                        response.cash_count?.review_notes ?? '';

                    this.isLoading = false;
                },

                error: (err) => {
                    this.review = null;
                    this.isLoading = false;

                    this.errorMessage =
                        err?.error?.message ??
                        'Unable to load the crew cash count.';
                },
            });
    }

    /*
     * Total Cash Count
     *
     * This comes directly from the crew's submitted
     * cash count. Head Crew does not edit it here.
     */
    get totalCashCount(): number {
        return Number(
            this.review?.actual_cash ??
            this.review?.cash_count?.total_cash ??
            0
        );
    }

    /*
     * Total Expenses
     *
     * This is the amount Head Crew can review/edit.
     */
    get totalExpenses(): number {
        return Number(this.reviewedExpenses || 0);
    }

    /*
     * Inventory must be completely checked
     * before Cash Count can be confirmed.
     */
    get allInventoryChecked(): boolean {
        if (!this.review) {
            return false;
        }

        const total =
            Number(this.review.inventory_count ?? 0);

        const checked =
            Number(
                this.review.checked_inventory_count ?? 0
            );

        return total > 0 && checked >= total;
    }

    /*
     * Check whether this Cash Count was already reviewed.
     */
    get isAlreadyReviewed(): boolean {
        return !!this.review?.cash_count?.reviewed_at;
    }

    /*
     * Confirm the Cash Count Review.
     *
     * After successful confirmation,
     * navigate to Summary.
     */
    saveReview(): void {
        this.errorMessage = null;
        this.successMessage = null;

        if (!this.review) {
            this.errorMessage =
                'There is no cash count to review.';
            return;
        }

        if (!this.allInventoryChecked) {
            this.errorMessage =
                'All inventory records must be checked before confirming the cash count.';
            return;
        }

        if (!this.checkedBy.trim()) {
            this.errorMessage =
                'Please enter your name.';
            return;
        }

        const expenses = Number(this.reviewedExpenses);

        if (!Number.isFinite(expenses) || expenses < 0) {
            this.errorMessage =
                'Please enter a valid expense amount.';
            return;
        }

        this.isSaving = true;

        this.cashCountService
            .saveReview({
                shift_number: this.shiftNumber,
                record_date: this.recordDate,
                reviewed_by: this.checkedBy.trim(),
                reviewed_expenses: expenses,
                review_notes:
                    this.reviewNotes.trim() || undefined,
            })
            .subscribe({
                next: () => {
                    this.isSaving = false;

                    // Navigate to Summary after successful confirmation
                    this.router.navigate(['/head-crew/summary'], {
                        queryParams: {
                            shift_number: this.shiftNumber,
                            record_date: this.recordDate,
                        },
                    });
                },

                error: (err) => {
                    this.isSaving = false;

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
                            'Failed to confirm the cash count.';
                    }
                },
            });
    }

    backToHeadCrew(): void {
        this.router.navigate(
            ['/head-crew'],
            {
                queryParams: {
                    shift_number: this.shiftNumber,
                    record_date: this.recordDate,
                },
            }
        );
    }

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