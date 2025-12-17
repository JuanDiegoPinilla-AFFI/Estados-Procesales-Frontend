import { Component, OnInit } from '@angular/core'; // Agregué OnInit
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Title } from '@angular/platform-browser';
import { AffiAlert } from '../../../../shared/services/affi-alert'; // <--- IMPORTANTE: Importar AffiAlert

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token = '';
  email = '';
  loading = false;
  
  // Estados para visibilidad
  showPassword = false;
  showConfirmPassword = false;
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
    this.isTogglingPassword = true;
    this.showPassword = !this.showPassword;
    setTimeout(() => { this.isTogglingPassword = false; }, 400);
  }

  toggleConfirmPasswordVisibility() {
    this.isTogglingConfirm = true;
    this.showConfirmPassword = !this.showConfirmPassword;
    setTimeout(() => { this.isTogglingConfirm = false; }, 400);
  }

  submit() {
    if (this.form.invalid) return;

    const { password, confirmPassword } = this.form.value;
    
    if (password !== confirmPassword) {
      AffiAlert.fire({
        icon: 'warning',
        title: 'Contraseñas no coinciden',
        text: 'Por favor verifica que ambas contraseñas sean iguales.'
      });
      return;
    }

    this.loading = true;

    this.authService.resetPassword({
      email: this.email,
      token: this.token,
      password,
    }).subscribe({
      next: res => {
        this.loading = false;
        const msg = res.message || '';
        
        // Verificamos si el mensaje menciona que sigue inactiva
        // (Esto coincide con lo que programamos en el backend: "...permanece inactiva...")
        if (msg.toLowerCase().includes('inactiva') || msg.toLowerCase().includes('bloqueada')) {
          
          AffiAlert.fire({
            icon: 'warning', // Amarillo
            title: 'Contraseña Actualizada',
            text: msg, // "Contraseña actualizada. Sin embargo, tu cuenta permanece inactiva..."
            confirmButtonText: 'Entendido'
          }).then(() => {
            this.router.navigate(['/auth/login']);
          });

        } else {
          // Éxito total
          AffiAlert.fire({
            icon: 'success', // Verde
            title: '¡Excelente!',
            text: 'Tu contraseña ha sido restablecida correctamente.',
            timerProgressBar: true,
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            this.router.navigate(['/auth/login']);
          });
        }
      },
      error: err => {
        this.loading = false;
        AffiAlert.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message || 'El enlace es inválido o ha expirado.'
        });
      }
    });
  }
}