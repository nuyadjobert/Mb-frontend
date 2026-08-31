import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-role-select',
  standalone: true,
  templateUrl: './role-select.component.html',
})
export class RoleSelectComponent {
  constructor(private router: Router) {}

  goTo(path: string): void {
    this.router.navigate([path]);
  }
}