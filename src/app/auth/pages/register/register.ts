import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import { AffiAlert } from '../../../shared/affi-alert';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
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
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.invalid) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Formulario incompleto',
        text: 'Por favor completa todos los campos requeridos.'
      });
      return;
    }

    this.authService.register(this.form.value).subscribe({
      next: res => {
        this.authService.saveToken(res.token);

        AffiAlert.fire({
          icon: 'success',
          title: 'Registro exitoso',
          text: 'Tu cuenta ha sido creada correctamente.',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/dashboard']);
        });
      },
      error: err => {
        AffiAlert.fire({
          icon: 'error',
          title: 'Error en el registro',
          text: err.error?.message || 'Ocurrió un error al intentar registrarte.'
        });
      }
    });
  }
}
