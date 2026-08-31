import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import { InventoryRecord } from '../../core/models/api.models';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './management.component.html',
})
export class ManagementComponent implements OnInit {
  readonly Number = Number;

  shiftNumber: 1 | 2 | 3 = 1;
  recordDate: string = new Date().toISOString().slice(0, 10);

  records: InventoryRecord[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    public authService: AuthService,
    private inventoryService: InventoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const shiftParam = qp.get('shift_number');
    const dateParam = qp.get('record_date');

    if (shiftParam) this.shiftNumber = Number(shiftParam) as 1 | 2 | 3;
    if (dateParam) this.recordDate = dateParam;

    this.loadRecords();
  }

  loadRecords(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.inventoryService.getRecords(this.shiftNumber, this.recordDate, 'checked').subscribe({
      next: (res: any) => {
        this.records = res.data ?? res;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load checked records.';
        this.isLoading = false;
      },
    });
  }

  get grandTotalSales(): number {
    return Math.round(this.records.reduce((sum, r) => sum + Number(r.total_sales), 0) * 100) / 100;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }
}