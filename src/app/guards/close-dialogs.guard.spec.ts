import { fakeAsync, flush, tick } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CLOSE_DIALOGS_TIMEOUT_MS, DialogHost, closeDialogsGuard } from './close-dialogs.guard';

// Spec 008 FR-011, research R7, red-team F2.
describe('closeDialogsGuard', () => {
  const run = (page: DialogHost | null) =>
    closeDialogsGuard(page as DialogHost, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot) as Promise<boolean>;

  it('waits for the dialogs to close, then allows leaving', fakeAsync(() => {
    let finish!: () => void;
    const page = { closeDialogs: jasmine.createSpy().and.returnValue(new Promise<void>((r) => (finish = r))) };
    let result: boolean | undefined;

    run(page).then((r) => (result = r));
    tick(10);
    expect(result).toBeUndefined();

    finish();
    tick();
    expect(result).toBeTrue();
    flush();
  }));

  it('allows leaving after the timeout when a dismissal hangs', fakeAsync(() => {
    let result: boolean | undefined;
    run({ closeDialogs: () => new Promise(() => {}) }).then((r) => (result = r));

    tick(CLOSE_DIALOGS_TIMEOUT_MS - 1);
    expect(result).toBeUndefined();
    tick(1);
    expect(result).toBeTrue();
  }));

  it('allows leaving when closing fails', fakeAsync(() => {
    let result: boolean | undefined;
    run({ closeDialogs: () => Promise.reject(new Error('x')) }).then((r) => (result = r));
    tick();
    expect(result).toBeTrue();
    flush();
  }));

  it('allows leaving a page without dialogs', async () => {
    expect(await run(null)).toBeTrue();
  });
});
