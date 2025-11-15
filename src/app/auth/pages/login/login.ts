import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // 🔒 Si ya hay sesión, mando al dashboard
    const token = this.authService.getToken();
    if (token) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.authService.login(this.form.value).subscribe({
      next: res => {
        this.authService.saveToken(res.token);
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        alert(err.error?.message || 'Error de login');
      }
    });
  }
}
