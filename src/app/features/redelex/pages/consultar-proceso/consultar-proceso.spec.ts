import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultarProcesoComponent } from './consultar-proceso';

describe('ConsultarProceso', () => {
  let component: ConsultarProcesoComponent;
  let fixture: ComponentFixture<ConsultarProcesoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultarProcesoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsultarProcesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
