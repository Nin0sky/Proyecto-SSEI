import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroOTUBIPage } from './registro-otubi.page';

describe('RegistroOTUBIPage', () => {
  let component: RegistroOTUBIPage;
  let fixture: ComponentFixture<RegistroOTUBIPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistroOTUBIPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
