import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { ImageCropperModule } from 'ngx-image-cropper';
import { MapboxAutocompleteModule } from 'src/app/components/mapbox-autocomplete/mapbox-autocomplete.module';
import { EditClubPage } from './edit-club.page';

describe('EditClubPage', () => {
  let component: EditClubPage;
  let fixture: ComponentFixture<EditClubPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EditClubPage],
      imports: [
        IonicModule.forRoot(),
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        ImageCropperModule,
        MapboxAutocompleteModule,
      ],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'club1' }) } } }],
    }).compileComponents();

    fixture = TestBed.createComponent(EditClubPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.clubId).toBe('club1');
  });
});
