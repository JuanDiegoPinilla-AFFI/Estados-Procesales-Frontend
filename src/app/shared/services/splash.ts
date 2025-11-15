import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SplashService {
  private _visible = new BehaviorSubject<boolean>(false);
  visible$ = this._visible.asObservable();

  show(duration = 1000) {
    this._visible.next(true);

    setTimeout(() => {
      this._visible.next(false);
    }, duration);
  }
}
