import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private titleService: Title
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Estados Procesales - Restablecer Contraseña');
  }

  submit() {
    if (this.form.invalid) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Correo incompleto',
        text: 'Por favor ingresa un correo electrónico válido.'
      });
      return;
    }

    this.loading = true;

    const emailString = this.form.get('email')?.value; 

    this.authService.requestPasswordReset(emailString).subscribe({
      next: (res) => {
        this.loading = false;
        
        AffiAlert.fire({
          icon: 'success',
          title: 'Solicitud Enviada',
          text: res.message || 'Si el correo existe, se enviará el enlace.',
          timerProgressBar: true,
          timer: 3500
        }).then(() => {
          this.router.navigate(['/auth/login']);
        });
      },
      error: (err) => {
        this.loading = false;
        AffiAlert.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message || 'Ocurrió un error al procesar la solicitud.'
        });
      }
    });
  }
}