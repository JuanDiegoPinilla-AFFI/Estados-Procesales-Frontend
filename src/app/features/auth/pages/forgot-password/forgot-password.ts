import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent {
  form: FormGroup;
  message = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private titleService: Title
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Affi - Restablecer Contraseña');
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.message = '';

    this.authService.requestPasswordReset(this.form.value.email).subscribe({
      next: res => {
        this.message = res.message || 'Si el correo está registrado, te enviaremos un enlace para restablecer la contraseña.';
        this.loading = false;
      },
      error: err => {
        this.message = err.error?.message || 'Ocurrió un error al solicitar el restablecimiento.';
        this.loading = false;
      }
    });
  }
}
