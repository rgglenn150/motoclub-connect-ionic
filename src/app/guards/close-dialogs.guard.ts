import { CanDeactivateFn } from '@angular/router';

/** A page whose in-page dialogs must be closed before it is left. */
export interface DialogHost {
  closeDialogs(): Promise<unknown>;
}

/** Red-team F2: a dismissal that never settles must not trap the person on the page. */
export const CLOSE_DIALOGS_TIMEOUT_MS = 1000;

/**
 * Inline ion-modals are teleported to <ion-app>, so a page destroyed while
 * one is presented leaves it behind as a blank box (spec 008 #95, research R7).
 * Waiting for the dismissal before the route changes removes that race. It
 * never blocks: it always allows the navigation once dialogs are closed or
 * the timeout passes.
 */
export const closeDialogsGuard: CanDeactivateFn<DialogHost> = async (page) => {
  if (!page?.closeDialogs) return true;
  const timeout = new Promise((resolve) => setTimeout(resolve, CLOSE_DIALOGS_TIMEOUT_MS));
  await Promise.race([page.closeDialogs().catch(() => undefined), timeout]);
  return true;
};
