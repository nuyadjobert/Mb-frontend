import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Branch, PublicBranch, UserRole } from '../models/api.models';

const TOKEN_KEY = 'mb_token';
const BRANCH_KEY = 'mb_branch';
const ROLE_KEY = 'mb_role';

interface StoreLoginResponse {
  branch: Branch;
  role: UserRole;
  token: string;
}

interface ManagementLoginResponse {
  user: { id: number; name: string; email: string; role: UserRole; branch_id: number | null };
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentBranch = signal<Branch | null>(this.loadStoredBranch());
  readonly currentRole = signal<UserRole | null>(this.loadStoredRole());
  readonly isAuthenticated = signal<boolean>(!!this.getToken());

  constructor(private http: HttpClient) {}

  getPublicBranches(): Observable<PublicBranch[]> {
    return this.http.get<PublicBranch[]>(`${environment.apiUrl}/public/branches`);
  }

  /** Crew or Head Crew login: branch + the code matching that role. */
  storeLogin(
    branchId: number,
    storeCode: string,
    loginAs: 'crew' | 'head_crew'
  ): Observable<StoreLoginResponse> {
    return this.http
      .post<StoreLoginResponse>(`${environment.apiUrl}/store-login`, {
        branch_id: branchId,
        store_code: storeCode,
        login_as: loginAs,
      })
      .pipe(
        tap((res) => {
          this.persistSession(res.token, res.role, res.branch);
        })
      );
  }

  /** Management login: email + password (admin/manager User accounts). */
  managementLogin(email: string, password: string): Observable<ManagementLoginResponse> {
    return this.http
      .post<ManagementLoginResponse>(`${environment.apiUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          this.persistSession(res.token, res.user.role, null);
        })
      );
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/logout`, {})
      .pipe(tap(() => this.clearSession()));
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(BRANCH_KEY);
    localStorage.removeItem(ROLE_KEY);
    this.currentBranch.set(null);
    this.currentRole.set(null);
    this.isAuthenticated.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private persistSession(token: string, role: UserRole, branch: Branch | null): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
    this.currentRole.set(role);

    if (branch) {
      localStorage.setItem(BRANCH_KEY, JSON.stringify(branch));
      this.currentBranch.set(branch);
    } else {
      localStorage.removeItem(BRANCH_KEY);
      this.currentBranch.set(null);
    }

    this.isAuthenticated.set(true);
  }

  private loadStoredBranch(): Branch | null {
    const raw = localStorage.getItem(BRANCH_KEY);
    return raw ? (JSON.parse(raw) as Branch) : null;
  }

  private loadStoredRole(): UserRole | null {
    return (localStorage.getItem(ROLE_KEY) as UserRole) ?? null;
  }
}