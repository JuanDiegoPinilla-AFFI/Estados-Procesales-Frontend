import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Intercom from '@intercom/messenger-js-sdk';
import { environment } from '../../../environments/environment';

export interface IntercomUser {
  user_id: string;
  name?: string;
  email?: string;
  created_at?: number; // unix seconds
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class IntercomService {
  private readonly isBrowser: boolean;
  private booted = false;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  boot(user?: IntercomUser) {
    if (!this.isBrowser) return;
    if (!environment.intercomAppId) return;

    // Carga el messenger
    Intercom({ app_id: environment.intercomAppId });

    // Boot real
    window.Intercom?.('boot', {
      app_id: environment.intercomAppId,
      ...(user ?? {}),
    });

    this.booted = true;
  }

  update(user?: IntercomUser) {
    if (!this.isBrowser) return;
    if (!environment.intercomAppId) return;

    if (!this.booted) {
      this.boot(user);
      return;
    }

    window.Intercom?.('update', {
      app_id: environment.intercomAppId,
      ...(user ?? {}),
    });
  }

  show() {
    if (!this.isBrowser || !this.booted) return;
    window.Intercom?.('show');
  }

  hide() {
    if (!this.isBrowser || !this.booted) return;
    window.Intercom?.('hide');
  }

  shutdown() {
    if (!this.isBrowser || !this.booted) return;
    window.Intercom?.('shutdown');
    this.booted = false;
  }
}
