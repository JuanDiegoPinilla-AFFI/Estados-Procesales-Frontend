import { TestBed } from '@angular/core/testing';

import { Redelex } from './redelex';

describe('Redelex', () => {
  let service: Redelex;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Redelex);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
