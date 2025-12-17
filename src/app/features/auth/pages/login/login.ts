import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  showPassword = false;
  isTogglingPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private titleService: Title
  ) {
    // Si ya está logueado, redirigir inteligentemente
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getUserData();
      if (user?.role === 'admin') {
         this.router.navigate(['/panel/consultas/consultar-proceso']);
      } else {
         this.router.navigate(['/panel/consultas/mis-procesos']);
      }
      return;
    }

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
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
    this.titleService.setTitle('Estados Procesales - Iniciar Sesión');
  }

  submit() {
    if (this.form.invalid) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Datos incompletos',
        text: 'Ingresa tu correo y contraseña para continuar.'
      });
      return;
    }

    this.authService.login(this.form.value).subscribe({
      next: res => {
        // Guardamos los datos del usuario
        if (res.user) {
           this.authService.saveUserData(res.user);
        }

        AffiAlert.fire({
          icon: 'success',
          title: 'Bienvenido',
          text: 'Inicio de sesión exitoso.',
          timer: 1300,
          showConfirmButton: false
          }).then(() => {
          const user = this.authService.getUserData();
          
          if (user?.role === 'affi') {
            this.router.navigate(['/panel/consultas/consultar-proceso']); 
          } else if (user?.role === 'admin' || user?.role === 'inmobiliaria') {
            this.router.navigate(['/panel/consultas/mis-procesos']);
          } else {
            // Fallback
            this.router.navigate(['/panel']); 
          }
        });
      },
      error: err => {
        const mensajeBackend = err.error?.message || 'Error desconocido';
        const msgLower = mensajeBackend.toLowerCase();

        // CASO 1: CUENTA BLOQUEADA O INACTIVA (Alerta ROJA)
        if (
          msgLower.includes('desactivad') || 
          msgLower.includes('inactiva') ||
          msgLower.includes('bloqueada')
        ) {
          AffiAlert.fire({
            icon: 'error', // Icono de error para bloqueo total
            title: 'Acceso Denegado',
            text: mensajeBackend // "Su cuenta ha sido desactivada..." o "Inmobiliaria inactiva"
          });
        } 
        // CASO 2: ADVERTENCIA DE INTENTOS (Alerta AMARILLA)
        else if (
          msgLower.includes('intento(s)') ||
          msgLower.includes('advertencia')
        ) {
          AffiAlert.fire({
            icon: 'warning',
            title: 'Advertencia de Seguridad',
            text: mensajeBackend
          });
        } 
        // CASO 3: CREDENCIALES INCORRECTAS GENÉRICAS
        else {
          AffiAlert.fire({
            icon: 'error',
            title: 'Error de acceso',
            text: 'Correo o contraseña incorrectos.'
          });
        }
      }
    });
  }
}