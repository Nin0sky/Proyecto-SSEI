import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormularioOtPage } from './formulario-ot.page';

describe('FormularioOtPage', () => {
  let component: FormularioOtPage;
  let fixture: ComponentFixture<FormularioOtPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FormularioOtPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
