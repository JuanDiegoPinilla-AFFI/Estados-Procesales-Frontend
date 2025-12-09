import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent {
  form: FormGroup;
  token = '';
  email = '';
  message = '';
  loading = false;
  
  // Estados para visibilidad de contraseñas
  showPassword = false;
  showConfirmPassword = false;
  
  // Estados para animaciones
  isTogglingPassword = false;
  isTogglingConfirm = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private titleService: Title
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });

    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token') || '';
      this.email = params.get('email') || '';
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Estados Procesales - Nueva Contraseña');
  }

  togglePasswordVisibility() {
    // Activar animación
    this.isTogglingPassword = true;
    
    // Cambiar visibilidad
    this.showPassword = !this.showPassword;
    
    // Desactivar animación después de completarse
    setTimeout(() => {
      this.isTogglingPassword = false;
    }, 400);
  }

  toggleConfirmPasswordVisibility() {
    // Activar animación
    this.isTogglingConfirm = true;
    
    // Cambiar visibilidad
    this.showConfirmPassword = !this.showConfirmPassword;
    
    // Desactivar animación después de completarse
    setTimeout(() => {
      this.isTogglingConfirm = false;
    }, 400);
  }

  submit() {
    if (this.form.invalid) return;

    const { password, confirmPassword } = this.form.value;
    if (password !== confirmPassword) {
      this.message = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    this.message = '';

    this.authService.resetPassword({
      email: this.email,
      token: this.token,
      password,
    }).subscribe({
      next: res => {
        this.message = res.message || 'Contraseña actualizada correctamente.';
        this.loading = false;

        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: err => {
        this.message = err.error?.message || 'Enlace inválido o expirado.';
        this.loading = false;
      }
    });
  }
}