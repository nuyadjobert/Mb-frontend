import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PublicBranch } from '../../core/models/api.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  branches: PublicBranch[] = [];
  selectedBranchId: number | null = null;
  storeCode = '';

  isLoadingBranches = true;
  isSubmitting = false;
  errorMessage: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.getPublicBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
        this.isLoadingBranches = false;
      },
      error: () => {
        this.errorMessage = 'Could not load branch list. Is the backend running?';
        this.isLoadingBranches = false;
      },
    });
  }

  submit(): void {
    this.errorMessage = null;

    if (!this.selectedBranchId) {
      this.errorMessage = 'Please select your store branch.';
      return;
    }
    if (!this.storeCode.trim()) {
      this.errorMessage = 'Please enter the store code.';
      return;
    }

    this.isSubmitting = true;

    this.authService.storeLogin(this.selectedBranchId, this.storeCode).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.errors?.store_code?.[0] ??
          err?.error?.message ??
          'Login failed. Please check your store code.';
      },
    });
  }
}
