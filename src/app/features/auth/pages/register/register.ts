import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { Title } from '@angular/platform-browser';
import { FeatherModule } from "angular-feather";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FeatherModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  showPassword = false;
  isTogglingPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private titleService: Title 
  ) {
    // Verificar si ya hay sesión activa
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/panel']);
      return;
    }

    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/)
      ]],
      nit: ['', Validators.required],
      codigoInmobiliaria: ['', Validators.required]
    });
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

  ngOnInit(): void {
    this.titleService.setTitle('Affi - Registrarse');
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.register(this.form.value).subscribe({
      next: (res: any) => {
        AffiAlert.fire({
          icon: 'success',
          title: 'Registro exitoso',
          text: 'Hemos enviado un enlace a tu correo. Por favor actívalo para iniciar sesión.',
          confirmButtonText: 'Ir al Login'
        }).then(() => {
          this.router.navigate(['/auth/login']);
        });
      },
      error: (err) => {
        AffiAlert.fire({
          icon: 'error',
          title: 'No se pudo registrar',
          text: err.error?.message || 'Verifica los datos ingresados.'
        });
      }
    });
  }
}