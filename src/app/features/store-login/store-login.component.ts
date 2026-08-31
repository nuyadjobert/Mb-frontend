import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PublicBranch } from '../../core/models/api.models';

@Component({
  selector: 'app-store-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './store-login.component.html',
})
export class StoreLoginComponent implements OnInit {
  branches: PublicBranch[] = [];
  selectedBranchId: number | null = null;
  storeCode = '';

  loginAs: 'crew' | 'head_crew' = 'crew';
  landingPath = '/dashboard';
  pageTitle = 'Crew Login';

  isLoadingBranches = true;
  isSubmitting = false;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const data = this.route.snapshot.data as {
      loginAs: 'crew' | 'head_crew';
      landingPath: string;
      pageTitle: string;
    };
    this.loginAs = data['loginAs'] ?? 'crew';
    this.landingPath = data['landingPath'] ?? '/dashboard';
    this.pageTitle = data['pageTitle'] ?? 'Crew Login';

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

    this.authService.storeLogin(this.selectedBranchId, this.storeCode, this.loginAs).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate([this.landingPath]);
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

  backToRoleSelect(): void {
    this.router.navigate(['/']);
  }
}