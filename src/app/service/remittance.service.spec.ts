import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { RemittanceCreate } from '../models/remittance.model';
import { RemittanceService } from './remittance.service';

// Spec 009 contracts: list, create (multipart) and void.
describe('RemittanceService', () => {
  let service: RemittanceService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/remittance`;

  const toMember: RemittanceCreate = {
    collection: 'c1',
    amount: 1500.5,
    recipientType: 'member',
    memberId: 'm1',
    note: 'Venue deposit',
    visibility: 'members',
    remittedOn: '2026-10-24',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(RemittanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a collection\'s remittances', () => {
    service.list('c1').subscribe();
    const req = httpMock.expectOne(`${base}/collection/c1`);
    expect(req.request.method).toBe('GET');
    req.flush({ summary: {}, remittances: [] });
  });

  it('creates as multipart, sending only the fields that are set', () => {
    service.create(toMember).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${base}/create`);
    expect(req.request.method).toBe('POST');
    // Uploads skip the service worker, as receipts do (spec 008 FR-015).
    expect(req.request.params.get('ngsw-bypass')).toBe('true');
    const body = req.request.body as FormData;
    expect(body.get('collection')).toBe('c1');
    expect(body.get('amount')).toBe('1500.5');
    expect(body.get('recipientType')).toBe('member');
    expect(body.get('memberId')).toBe('m1');
    expect(body.get('note')).toBe('Venue deposit');
    expect(body.get('visibility')).toBe('members');
    expect(body.get('remittedOn')).toBe('2026-10-24');
    expect(body.has('recipientName')).toBeFalse();
    expect(body.has('recipientAccount')).toBeFalse();
    expect(body.has('proof')).toBeFalse();
    req.flush({ remittance: {}, summary: {} });
  });

  it('attaches the proof photo when there is one', () => {
    const proof = new File([new Uint8Array(8)], 'proof.jpg', { type: 'image/jpeg' });
    service
      .create({ ...toMember, recipientType: 'external', memberId: undefined, recipientName: 'Casa Verde', recipientAccount: 'GCash 0917' }, proof)
      .subscribe();
    const body = httpMock.expectOne((r) => r.url === `${base}/create`).request.body as FormData;
    expect(body.get('proof')).toBe(proof);
    expect(body.get('recipientName')).toBe('Casa Verde');
    expect(body.get('recipientAccount')).toBe('GCash 0917');
    expect(body.has('memberId')).toBeFalse();
  });

  it('voids with a reason', () => {
    service.void('r1', 'Wrong amount').subscribe();
    const req = httpMock.expectOne(`${base}/r1/void`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ reason: 'Wrong amount' });
    req.flush({ remittance: {}, summary: {} });
  });
});
