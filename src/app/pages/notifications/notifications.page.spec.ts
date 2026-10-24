import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';
import { Notification, NotificationService } from '../../service/notification.service';
import { NotificationsPage } from './notifications.page';

// Spec 009 Story 6: remittance notifications open the collection.
describe('NotificationsPage remittance notifications', () => {
  let page: NotificationsPage;
  let router: jasmine.SpyObj<Router>;
  let service: jasmine.SpyObj<NotificationService>;

  const note = (overrides: Partial<Notification>): Notification => ({
    _id: 'n1',
    type: 'remittance_recorded',
    message: '₱10,000 from QA Dues was remitted to you.',
    club: { _id: 'club1', name: 'Demo Riders' },
    read: true,
    createdAt: '2026-10-24T03:10:00Z',
    data: { collectionId: 'col1', remittanceId: 'r1' },
    ...overrides,
  });

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    service = jasmine.createSpyObj('NotificationService', ['markAsRead']);
    service.markAsRead.and.returnValue(of({} as any));
    TestBed.configureTestingModule({
      providers: [
        NotificationsPage,
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: service },
        { provide: AlertController, useValue: {} },
        { provide: ToastController, useValue: {} },
      ],
    });
    page = TestBed.inject(NotificationsPage);
  });

  for (const type of ['remittance_recorded', 'remittance_voided'] as const) {
    it(`opens the collection from ${type}`, () => {
      page.onNotificationClick(note({ type }));

      expect(router.navigate).toHaveBeenCalledOnceWith(['/clubs', 'club1', 'collection', 'col1']);
    });
  }

  it('falls back to the club when the collection id is missing', () => {
    page.onNotificationClick(note({ data: {} }));

    expect(router.navigate).toHaveBeenCalledOnceWith(['/clubs', 'club1']);
  });

  it('shows the server message, a cash icon and a colour for both types', () => {
    // The real service polls the API from its constructor, so call the pure helpers on its prototype.
    const real = Object.create(NotificationService.prototype) as NotificationService;
    for (const type of ['remittance_recorded', 'remittance_voided'] as const) {
      expect(real.formatNotificationMessage(note({ type, message: 'server text' }))).toBe('server text');
      expect(real.getNotificationIcon(type)).toBe('cash-outline');
    }
    expect(real.getNotificationColor('remittance_recorded')).toBe('success');
    expect(real.getNotificationColor('remittance_voided')).toBe('danger');
  });
});
