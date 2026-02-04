import { ApplicationConfig, LOCALE_ID, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { routes } from './app.routes';
import { authInterceptor } from './features/auth/interceptors/auth-interceptor';
import { FeatherModule } from 'angular-feather';
import { 
  Search, LogOut, Menu, X, Users, Folder, BarChart2, FileText, Headphones,
  ArrowRightCircle, Plus, Edit2, Info, Shield, Check, MessageCircle, PieChart,
  Mail, Hash, User, Phone, Edit3, CreditCard, Trash, PhoneForwarded, PhoneIncoming,
  PhoneOutgoing, ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight, PhoneCall,
  Layers, Bell, Clock, Calendar, CheckCircle, Award, TrendingUp, Activity, Briefcase,
  UserX, UserCheck, Database, Eye, Download, EyeOff, ChevronDown, Home, UploadCloud,
  RefreshCw, ShieldOff, AlertCircle, XCircle, MapPin, DollarSign, Grid, Filter, AlertTriangle
} from 'angular-feather/icons';

registerLocaleData(localeEsCo, 'es-CO');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(
      FeatherModule.pick({
        Search, LogOut, Menu, X, Users, Folder, BarChart2, FileText, MessageCircle,
        Mail, Hash, User, Phone, Edit3, CreditCard, Headphones, ArrowRightCircle,
        Plus, Edit2, Info, Shield, Check, Trash, Download, PieChart, ArrowDownLeft,
        ArrowUpRight, Bell, PhoneForwarded, ChevronLeft, ChevronRight, PhoneIncoming,
        PhoneOutgoing, PhoneCall, Clock, Calendar, Layers, Award, CheckCircle, TrendingUp,
        Activity, Briefcase, UserX, UserCheck, Database, Eye, EyeOff, ChevronDown, Home,
        UploadCloud, RefreshCw, ShieldOff, AlertCircle, XCircle, MapPin, DollarSign, Grid, Filter, AlertTriangle
      })
    ),
    { provide: LOCALE_ID, useValue: 'es-CO' }
  ]
};