import { Component, OnInit } from '@angular/core'; // Agregué OnInit
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private titleService: Title
  ) {
    // 🔒 CORRECCIÓN 1: Usamos isLoggedIn() en lugar de getToken()
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/panel']); // Ojo: Asegúrate que esta ruta exista
      return;
    }

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Affi - Iniciar Sesión');
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
          this.router.navigate(['/panel']);
        });
      },
      error: err => {
        // Capturamos el mensaje que viene del Backend
        const mensajeBackend = err.error?.message || '';

        // 🟡 CASO 1: USUARIO INACTIVO
        // Buscamos palabras clave como "desactivada" o "inactivo"
        if (mensajeBackend.toLowerCase().includes('desactivada') || mensajeBackend.toLowerCase().includes('inactivo')) {
          AffiAlert.fire({
            icon: 'warning', // Icono amarillo
            title: 'Usuario Inactivo',
            text: mensajeBackend || 'Su cuenta se encuentra desactivada.'
          });
        } 
        // 🔴 CASO 2: ERROR GENÉRICO (Contraseña mal, etc.)
        else {
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