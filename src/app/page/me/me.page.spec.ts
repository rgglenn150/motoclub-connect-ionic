import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MePage } from './me.page';
import { HttpClient, HttpHandler } from '@angular/common/http';

describe('MePage', () => {
  let component: MePage;
  let fixture: ComponentFixture<MePage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MePage ],
      imports: [IonicModule.forRoot()],
      providers: [
        HttpClient,HttpHandler
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
