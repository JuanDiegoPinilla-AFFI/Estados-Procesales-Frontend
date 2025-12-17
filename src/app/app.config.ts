import { ApplicationConfig, LOCALE_ID, importProvidersFrom } from '@angular/core'; // <--- Importar importProvidersFrom
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

// Idioma Español
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';

import { routes } from './app.routes';
import { authInterceptor } from './features/auth/interceptors/auth-interceptor';

// 1. IMPORTAMOS LA LIBRERÍA Y LOS ÍCONOS AQUÍ
import { FeatherModule } from 'angular-feather';
import { 
  Search, LogOut, Menu, X, Users, Folder, BarChart2, FileText,
  Plus, Edit2, Info, Shield, Check, PieChart, Trash, Layers, Bell, Clock, Calendar, CheckCircle, Award, TrendingUp, Activity, Briefcase, UserX, UserCheck, Database, Eye, Download, EyeOff, ChevronDown, Home, UploadCloud, RefreshCw
} from 'angular-feather/icons';

registerLocaleData(localeEsCo, 'es-CO');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    
    // 2. REGISTRAMOS LOS ÍCONOS GLOBALMENTE
    importProvidersFrom(
      FeatherModule.pick({
        Search, LogOut, Menu, X, Users, Folder, BarChart2, FileText,
        Plus, Edit2, Info, Shield, Check, Trash, Download, PieChart, Bell, Clock, Calendar, Layers, Award, CheckCircle, TrendingUp, Activity, Briefcase, UserX, UserCheck, Database, Eye, EyeOff, ChevronDown, Home, UploadCloud, RefreshCw
      })
    ),

    { provide: LOCALE_ID, useValue: 'es-CO' }
  ]
};