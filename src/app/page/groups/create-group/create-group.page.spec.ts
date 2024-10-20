import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CreateGroupPage } from './create-group.page';
import { HttpClient, HttpHandler } from '@angular/common/http';

describe('CreateGroupPage', () => {
  let component: CreateGroupPage;
  let fixture: ComponentFixture<CreateGroupPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateGroupPage ],
      imports: [IonicModule.forRoot()],
      providers: [HttpClient, HttpHandler]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateGroupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
