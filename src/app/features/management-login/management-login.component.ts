import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-management-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './management-login.component.html',
})
export class ManagementLoginComponent {
  email = '';
  password = '';
  isSubmitting = false;
  errorMessage: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  submit(): void {
    this.errorMessage = null;

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.isSubmitting = true;

    this.authService.managementLogin(this.email, this.password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/management']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.errors?.email?.[0] ??
          err?.error?.message ??
          'Login failed. Please check your credentials.';
      },
    });
  }

  backToRoleSelect(): void {
    this.router.navigate(['/']);
  }
}