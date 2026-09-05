import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { AuthService } from '../../core/services/auth.service';
import { InventoryService } from '../../core/services/inventory.service';
import { CashCountService } from '../../core/services/cash-count.service';
import { CashCount, InventoryRecord } from '../../core/models/api.models';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './summary.component.html',
})
export class SummaryComponent implements OnInit {
  readonly Number = Number;

  shiftNumber: 1 | 2 | 3 = 1;
  recordDate: string = new Date().toISOString().slice(0, 10);
  crewName = '';
  approverName = '';

  records: InventoryRecord[] = [];
  cashCount: CashCount | null = null;

  isLoading = false;
  isFinalizing = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    public authService: AuthService,
    private inventoryService: InventoryService,
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
    if (crewParam) {
      this.crewName = crewParam;
      this.approverName = crewParam;
    }

    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.inventoryService.getRecords(this.shiftNumber, this.recordDate).subscribe({
      next: (res: any) => {
        this.records = res.data ?? res;
        this.maybeStopLoading();
      },
      error: () => {
        this.errorMessage = 'Failed to load product records.';
        this.maybeStopLoading();
      },
    });

    this.cashCountService.getCashCount(this.shiftNumber, this.recordDate).subscribe({
      next: (cc) => {
        this.cashCount = cc;
        this.maybeStopLoading();
      },
      error: () => {
        this.maybeStopLoading();
      },
    });
  }

  private loadedCount = 0;
  private maybeStopLoading(): void {
    this.loadedCount++;
    if (this.loadedCount >= 2) {
      this.isLoading = false;
    }
  }

  get grandTotalSales(): number {
    return Math.round(this.records.reduce((sum, r) => sum + Number(r.total_sales), 0) * 100) / 100;
  }

  get isFinalized(): boolean {
    return !!this.cashCount?.finalized_at;
  }

  get denominationRows(): { label: string; qty: number; subtotal: number }[] {
    if (!this.cashCount) return [];
    const cc = this.cashCount;
    return [
      { label: '₱1000', qty: cc.pieces_1000, subtotal: cc.pieces_1000 * 1000 },
      { label: '₱500', qty: cc.pieces_500, subtotal: cc.pieces_500 * 500 },
      { label: '₱100', qty: cc.pieces_100, subtotal: cc.pieces_100 * 100 },
      { label: '₱50', qty: cc.pieces_50, subtotal: cc.pieces_50 * 50 },
      { label: '₱20', qty: cc.pieces_20, subtotal: cc.pieces_20 * 20 },
      { label: '₱10', qty: cc.pieces_10, subtotal: cc.pieces_10 * 10 },
      { label: '₱5', qty: cc.pieces_5, subtotal: cc.pieces_5 * 5 },
      { label: '₱1', qty: cc.pieces_1, subtotal: cc.pieces_1 * 1 },
    ];
  }

  downloadPdf(): void {
    const doc = new jsPDF();
    const branchName = this.authService.currentBranch()?.name ?? 'Minute Burger';

    doc.setFontSize(16);
    doc.text('Minute Burger - Shift Summary', 14, 16);

    doc.setFontSize(10);
    doc.text(`Branch: ${branchName}`, 14, 24);
    doc.text(`Shift: ${this.shiftNumber}    Date: ${this.recordDate}`, 14, 30);
    doc.text(`Crew: ${this.crewName || '-'}`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [['Item', 'Beg', 'Del', 'Out', 'End', 'Usage', 'Order', 'Sales']],
      body: this.records.map((r) => [
        r.item?.name ?? '',
        r.beginning_qty,
        r.del_qty,
        r.out_qty,
        r.ending_qty,
        r.usage_qty,
        r.total_order,
        `₱${Number(r.total_sales).toFixed(2)}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234, 88, 12] },
    });

    let y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(11);
    doc.text(`Total Sales: P${this.grandTotalSales.toFixed(2)}`, 14, y);
    y += 10;

    if (this.cashCount) {
      doc.setFontSize(13);
      doc.text('Cash Count', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Denomination', 'Qty', 'Subtotal']],
        body: this.denominationRows.map((d) => [d.label, d.qty, `P${d.subtotal.toLocaleString()}`]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [234, 88, 12] },
      });

      y = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(10);
      doc.text(`Total Cash: P${Number(this.cashCount.total_cash).toFixed(2)}`, 14, y);
      y += 6;
      doc.text(`Total Expenses: P${Number(this.cashCount.total_expenses).toFixed(2)}`, 14, y);
      y += 6;
      doc.text(`Net Cash: P${Number(this.cashCount.net_cash).toFixed(2)}`, 14, y);
      y += 8;

      if (this.cashCount.serials_1000?.length) {
        doc.text(`1000-bill serials: ${this.cashCount.serials_1000.join(', ')}`, 14, y);
        y += 6;
      }
      if (this.cashCount.serials_500?.length) {
        doc.text(`500-bill serials: ${this.cashCount.serials_500.join(', ')}`, 14, y);
        y += 6;
      }
      if (this.cashCount.notes) {
        doc.text(`Note: ${this.cashCount.notes}`, 14, y);
        y += 6;
      }
    }

    if (this.isFinalized) {
      doc.setFontSize(10);
      doc.text(
        `Approved by: ${this.cashCount?.finalized_by} on ${new Date(this.cashCount!.finalized_at!).toLocaleString()}`,
        14,
        y + 4
      );
    }

    doc.save(`shift-summary-${this.recordDate}-shift${this.shiftNumber}.pdf`);
  }

  approveAndFinalize(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.approverName.trim()) {
      this.errorMessage = 'Please enter your name to approve this shift.';
      return;
    }
    if (!this.cashCount) {
      this.errorMessage = 'Cash count must be saved before this shift can be approved.';
      return;
    }

    this.isFinalizing = true;

    this.cashCountService.finalize(this.shiftNumber, this.recordDate, this.approverName).subscribe({
      next: (cc) => {
        this.isFinalizing = false;
        this.cashCount = cc;
        this.successMessage = 'Shift approved and finalized.';
      },
      error: (err) => {
        this.isFinalizing = false;
        this.errorMessage = err?.error?.message ?? 'Failed to finalize shift.';
      },
    });
  }

  backToCashCount(): void {
    this.router.navigate(['/cash-count'], {
      queryParams: {
        shift_number: this.shiftNumber,
        record_date: this.recordDate,
        crew_name: this.crewName,
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