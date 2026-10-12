import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BROWSER_HISTORY, BrowserHistory, DialogHistoryService } from './dialog-history.service';

/** A history stack that fires popstate like a browser (back() is async). */
class FakeHistory implements BrowserHistory {
  entries: any[] = [{ page: true }];
  index = 0;
  get state() {
    return this.entries[this.index];
  }
  pushState(state: any) {
    this.entries.splice(this.index + 1);
    this.entries.push(state);
    this.index++;
  }
  back() {
    setTimeout(() => this.go(-1));
  }
  /** What the person's Back press does. */
  go(delta: number) {
    this.index += delta;
    window.dispatchEvent(new PopStateEvent('popstate', { state: this.state }));
  }
}

// Spec 008 Story 2, research R6/R9, red-team F1.
describe('DialogHistoryService', () => {
  let history: FakeHistory;
  let service: DialogHistoryService;

  beforeEach(() => {
    history = new FakeHistory();
    TestBed.configureTestingModule({ providers: [{ provide: BROWSER_HISTORY, useValue: history }] });
    service = TestBed.inject(DialogHistoryService);
  });

  function layer(id: string, onBack: () => boolean = () => true) {
    const spy = jasmine.createSpy(id, onBack).and.callThrough();
    service.push({ id, onBack: spy });
    return spy;
  }

  it('pushes a same-URL entry per open dialog, keeping the router state', () => {
    layer('payment');

    expect(history.entries.length).toBe(2);
    expect(history.state).toEqual({ page: true, mcDialog: jasmine.any(Number), mcBelow: undefined });
  });

  it('pushes once per dialog id', () => {
    layer('payment');
    layer('payment');
    expect(history.entries.length).toBe(2);
  });

  it('Back closes the top dialog and stays on the page (AC1)', () => {
    const onBack = layer('payment');

    history.go(-1);

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(service.depth).toBe(0);
    expect(history.index).toBe(0);
  });

  it('Back closes only the top of stacked dialogs (AC4)', () => {
    const bulk = layer('bulkVerify');
    const payment = layer('payment');

    history.go(-1);

    expect(payment).toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
    expect(service.depth).toBe(1);

    history.go(-1);
    expect(bulk).toHaveBeenCalled();
    expect(service.depth).toBe(0);
  });

  it('a close button removes the entry, so the next Back leaves the page (AC6)', fakeAsync(() => {
    const onBack = layer('payment');

    service.closed('payment');
    tick();

    expect(history.index).toBe(0);
    expect(onBack).not.toHaveBeenCalled();
  }));

  it('closing an unknown or already-closed dialog does nothing', fakeAsync(() => {
    layer('payment');
    history.go(-1);

    service.closed('payment');
    service.closed('nope');
    tick();

    expect(history.index).toBe(0);
  }));

  it('a lost popstate cannot swallow a later real Back (red-team F1)', fakeAsync(() => {
    layer('payment');
    spyOn(history, 'back'); // the browser never fires popstate for our back()
    service.closed('payment');
    tick(1500);

    const onBack = layer('addPayment');
    history.go(-1);

    expect(onBack).toHaveBeenCalled();
  }));

  it('re-pushes the entry when the dialog stays open (dirty form)', () => {
    const onBack = layer('addPayment', () => false);

    history.go(-1);

    expect(onBack).toHaveBeenCalled();
    expect(service.depth).toBe(1);
    expect(history.index).toBe(1);

    history.go(-1);
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('a rapid double Back closes one dialog per press', () => {
    const bulk = layer('bulkVerify');
    const payment = layer('payment');

    history.go(-1);
    history.go(-1);

    expect(payment).toHaveBeenCalledTimes(1);
    expect(bulk).toHaveBeenCalledTimes(1);
    expect(service.depth).toBe(0);
  });

  it('ignores Back with no dialog open, and Forward', () => {
    history.pushState({ other: true });
    history.go(-1);
    expect(service.depth).toBe(0);

    const onBack = layer('payment');
    history.go(-1);
    history.go(1); // forward onto the old entry
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  /** Stand-ins for Ionic overlays, found through the service's DOM lookup. */
  function prompts(...hidden: boolean[]) {
    const els = hidden.map((isHidden) => {
      const el = document.createElement('div') as any;
      if (isHidden) el.classList.add('overlay-hidden');
      el.dismiss = jasmine.createSpy('dismiss').and.resolveTo(true);
      return el;
    });
    const real = document.querySelectorAll.bind(document);
    spyOn(document, 'querySelectorAll').and.callFake(((selector: string) =>
      selector === 'ion-alert, ion-action-sheet' ? els : real(selector)) as any);
    return els;
  }

  it('a presented prompt closes first and the dialog stays (R9)', () => {
    const onBack = layer('payment');
    const [alert] = prompts(false);

    history.go(-1);

    expect(alert.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    expect(onBack).not.toHaveBeenCalled();
    expect(history.index).toBe(1);
  });

  it('ignores prompts that are not presented', () => {
    const onBack = layer('payment');
    const [hidden] = prompts(true);

    history.go(-1);

    expect(hidden.dismiss).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });

  it('reset forgets layers without touching history', () => {
    layer('payment');
    service.reset();

    expect(service.depth).toBe(0);
    expect(history.index).toBe(1);
  });
});
