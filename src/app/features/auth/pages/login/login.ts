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
          
          if (user?.role === 'admin') {
            this.router.navigate(['/panel/consultas/consultar-proceso']); 
          } else {
            this.router.navigate(['/panel/consultas/mis-procesos']);
          }
        });
      },
      error: err => {
        const mensajeBackend = err.error?.message || '';

        // --- CORRECCIÓN AQUÍ: Agregamos 'intento(s)' ---
        if (
          mensajeBackend.toLowerCase().includes('desactivada') || 
          mensajeBackend.toLowerCase().includes('inactivo') ||
          mensajeBackend.toLowerCase().includes('advertencia') ||
          mensajeBackend.toLowerCase().includes('intento(s)')
        ) {
          AffiAlert.fire({
            icon: 'warning',
            title: 'Atención',
            text: mensajeBackend
          });
        } else {
          AffiAlert.fire({
            icon: 'error',
            title: 'Error al iniciar sesión',
            text: 'Correo o contraseña incorrectos.'
          });
        }
      }
    });
  }
}