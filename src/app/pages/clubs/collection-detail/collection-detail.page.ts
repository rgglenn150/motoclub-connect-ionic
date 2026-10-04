import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController, ViewWillLeave } from '@ionic/angular';
import { CollectionService } from '../../../service/collection.service';
import { Collection } from '../../../models/collection.model';
import { PaymentService, Payment, PaymentResolution, PaymentStatusConflict } from '../../../service/payment.service';
import { HttpErrorResponse } from '@angular/common/http';
import { UserStateService } from '../../../service/user-state.service';
import { ClubService } from '../../../service/club.service';

@Component({
  selector: 'app-collection-detail',
  templateUrl: './collection-detail.page.html',
  styleUrls: ['./collection-detail.page.scss'],
})
export class CollectionDetailPage implements OnInit, ViewWillLeave {
  clubId: string = '';
  collectionId: string = '';

  collection: Collection | null = null;
  collectionLoading = false;
  /** Network/server failure, as opposed to a collection the viewer can't see. */
  collectionError = false;

  payments: Payment[] = [];
  paymentsLoading = false;

  isAdmin = false;
  isMember = false;
  accessDenied = false;

  // Add payment modal
  showAddPaymentModal = false;
  paymentForm: { name: string; accountName: string; amount: number | null; referenceNumber: string; phoneNumber: string; description: string; transactionDate: string } = { name: '', accountName: '', amount: null, referenceNumber: '', phoneNumber: '', description: '', transactionDate: '' };
  receiptFile: File | null = null;
  receiptPreviewUrl: string | null = null;
  isExtractingReceipt = false;
  isSavingPayment = false;

  // Payment dialog (spec 003): admins, and the payer for their own payment.
  showPaymentModal = false;
  selectedPayment: Payment | null = null;

  // Bulk verify from a GCash statement (spec 004): admins only.
  showBulkVerify = false;

  get pendingCount(): number {
    return this.payments.filter(p => p.status === 'pending').length;
  }

  get clubName(): string | null {
    return this.collection?.clubName || null;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private collectionService: CollectionService,
    private paymentService: PaymentService,
    private userStateService: UserStateService,
    private clubService: ClubService,
    private alertController: AlertController,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    this.clubId = this.route.snapshot.paramMap.get('clubId') || '';
    this.collectionId = this.route.snapshot.paramMap.get('collectionId') || '';
    const autoOpenPayment = window.location.pathname.endsWith('/payment');
    this.checkAdminStatus();
    this.loadCollection(autoOpenPayment);
    this.loadPayments();
  }

  /**
   * Inline ion-modals are teleported to <ion-app> while presented, so they are
   * not removed with this page when the router destroys it. Close them before
   * leaving, otherwise an orphaned (and unstyled) modal is left over the next page.
   */
  ionViewWillLeave() {
    this.showAddPaymentModal = false;
    this.showPaymentModal = false;
    this.showBulkVerify = false;
  }

  private checkAdminStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;
    this.clubService.getMembershipStatus(this.clubId).subscribe({
      next: (res: any) => {
        this.isAdmin = res.status === 'admin';
        this.isMember = res.status === 'member' || res.status === 'admin';
      },
      error: () => {}
    });
  }

  /**
   * Loads the collection, including its confirmed/pending totals. Also called
   * after payments change: the server is the only source of the totals.
   */
  loadCollection(autoOpenPayment = false) {
    this.collectionLoading = true;
    this.collectionError = false;
    this.collectionService.getCollections(this.clubId).subscribe({
      next: (res) => {
        this.collection = res.collections.find(c => c._id === this.collectionId) || null;
        this.collectionLoading = false;
        this.accessDenied = !this.collection;
        if (this.collection && autoOpenPayment) {
          this.openAddPaymentModal();
        }
      },
      error: () => {
        this.collectionLoading = false;
        this.collectionError = true;
      }
    });
  }

  loadPayments() {
    this.paymentsLoading = true;
    this.paymentService.getPayments(this.collectionId).subscribe({
      next: (res) => {
        this.payments = res.payments;
        this.paymentsLoading = false;
      },
      error: () => { this.paymentsLoading = false; }
    });
  }

  goBack() {
    this.router.navigate(['/clubs', this.clubId], { queryParams: { tab: 'tools' } });
  }

  private nowLocalDatetime(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  /** Opens the payment dialog when this viewer may see the details (spec 003 FR-009, FR-014). */
  openPayment(payment: Payment) {
    if (!payment.detailsVisible) return;
    this.selectedPayment = payment;
    this.showPaymentModal = true;
  }

  closePayment() {
    this.showPaymentModal = false;
    this.selectedPayment = null;
  }

  openBulkVerify() {
    if (!this.isAdmin || this.pendingCount === 0) return;
    this.showBulkVerify = true;
  }

  closeBulkVerify() {
    this.showBulkVerify = false;
  }

  /** After any bulk verify attempt: the server is the only source of statuses and totals (spec 004, red-team F3). */
  refreshAfterBulkVerify() {
    this.loadPayments();
    this.loadCollection();
  }

  /** A bulk verify result was tapped: check it in the payment dialog (spec 004, red-team F1). */
  openPaymentById(paymentId: string) {
    const payment = this.payments.find(p => p._id === paymentId);
    if (payment) this.openPayment(payment);
  }

  openAddPaymentModal() {
    this.paymentForm = { name: '', accountName: '', amount: null, referenceNumber: '', phoneNumber: '', description: '', transactionDate: this.nowLocalDatetime() };
    this.receiptFile = null;
    this.receiptPreviewUrl = null;
    this.showAddPaymentModal = true;
  }

  closeAddPaymentModal() {
    this.showAddPaymentModal = false;
    this.receiptFile = null;
    this.receiptPreviewUrl = null;
  }

  onReceiptSelected(event: globalThis.Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.receiptFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.receiptPreviewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
    this.isExtractingReceipt = true;
    this.paymentService.extractReceipt(file).subscribe({
      next: (data) => {
        if (data.name) this.paymentForm.accountName = data.name;
        if (data.amount) this.paymentForm.amount = data.amount;
        if (data.referenceNumber) this.paymentForm.referenceNumber = data.referenceNumber;
        if (data.phoneNumber) this.paymentForm.phoneNumber = data.phoneNumber;
        if (data.transactionDateTime) {
          // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
          this.paymentForm.transactionDate = data.transactionDateTime.slice(0, 16);
        }
        this.isExtractingReceipt = false;
      },
      error: async (err) => {
        this.isExtractingReceipt = false;
        const msg = err?.error?.message || 'Could not read receipt. Please fill in the fields manually.';
        const toast = await this.toastController.create({ message: msg, duration: 3000, color: 'warning', position: 'top' });
        await toast.present();
      }
    });
  }

  savePayment() {
    if (!this.paymentForm.name?.trim() || !this.paymentForm.amount || !this.paymentForm.referenceNumber) return;
    this.isSavingPayment = true;
    const formData = new FormData();
    formData.append('collection', this.collectionId);
    formData.append('name', this.paymentForm.name);
    if (this.paymentForm.accountName) formData.append('accountName', this.paymentForm.accountName);
    formData.append('amount', String(this.paymentForm.amount));
    formData.append('referenceNumber', this.paymentForm.referenceNumber);
    if (this.paymentForm.phoneNumber) formData.append('phoneNumber', this.paymentForm.phoneNumber);
    if (this.paymentForm.description) formData.append('description', this.paymentForm.description);
    if (this.paymentForm.transactionDate) formData.append('transactionDate', this.paymentForm.transactionDate);
    if (this.receiptFile) formData.append('receipt', this.receiptFile);
    this.paymentService.createPayment(formData).subscribe({
      next: (res) => {
        this.payments.unshift(res.payment);
        this.loadCollection();
        this.isSavingPayment = false;
        this.closeAddPaymentModal();
      },
      error: async (err) => {
        this.isSavingPayment = false;
        const msg = err?.error?.message || 'Failed to save payment.';
        const toast = await this.toastController.create({ message: msg, duration: 3000, color: 'danger', position: 'top' });
        await toast.present();
      }
    });
  }

  // --- Payment dialog actions (spec 003, US2 + US4) -------------------------

  isPaymentActionBusy = false;

  /** Admin, and the open payment is still awaiting verification. */
  get canReview(): boolean {
    return this.isAdmin && this.selectedPayment?.status === 'pending';
  }

  /** Admins may delete any payment; payers only read their own. */
  get canDelete(): boolean {
    return this.isAdmin && !!this.selectedPayment;
  }

  verifyPayment() {
    return this.resolveSelected('confirmed');
  }

  rejectPayment() {
    return this.resolveSelected('rejected');
  }

  /**
   * Verify or reject the open payment after confirming it's final (spec 001
   * Story 5: a mistake is fixed by deleting the payment and adding it again).
   */
  private async resolveSelected(status: PaymentResolution) {
    const payment = this.selectedPayment;
    if (!payment || !this.canReview) return;
    const label = status === 'confirmed' ? 'Verify' : 'Reject';
    const alert = await this.alertController.create({
      header: `${label} payment?`,
      message: `${label} ${payment.name}'s payment? This is final. To undo it later, delete the payment and add it again.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: label, handler: () => this.sendStatus(payment, status) },
      ],
    });
    await alert.present();
  }

  private sendStatus(payment: Payment, status: PaymentResolution) {
    this.isPaymentActionBusy = true;
    this.paymentService.updateStatus(payment._id, status).subscribe({
      next: (res) => {
        this.isPaymentActionBusy = false;
        this.applyStatus(payment, res.payment.status);
        this.loadCollection();
      },
      error: async (err: HttpErrorResponse) => {
        this.isPaymentActionBusy = false;
        let message = 'Failed to update the payment.';
        if (err.status === 409) {
          // Already decided (e.g. by another admin): show what the server has.
          const conflict = err.error as PaymentStatusConflict;
          this.applyStatus(payment, conflict.status);
          message = conflict.message;
          this.loadCollection();
        }
        const toast = await this.toastController.create({ message, duration: 3000, color: 'danger' });
        await toast.present();
      }
    });
  }

  private applyStatus(payment: Payment, status: Payment['status']) {
    payment.status = status;
    const listed = this.payments.find(p => p._id === payment._id);
    if (listed) listed.status = status;
  }

  async deleteSelected() {
    const payment = this.selectedPayment;
    if (!payment || !this.canDelete) return;
    const alert = await this.alertController.create({
      header: 'Delete payment?',
      message: `Remove ${payment.name}'s payment of ₱${payment.amount.toLocaleString('en-PH')}? This can't be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.isPaymentActionBusy = true;
            this.paymentService.deletePayment(payment._id).subscribe({
              next: () => {
                this.isPaymentActionBusy = false;
                this.payments = this.payments.filter(p => p._id !== payment._id);
                this.closePayment();
                this.loadCollection();
              },
              error: async () => {
                this.isPaymentActionBusy = false;
                const toast = await this.toastController.create({ message: 'Failed to delete the payment.', duration: 2000, color: 'danger' });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  /** Copy the reference so admins can check it in GCash or a bank app (spec 003 FR-010). */
  async copyReference() {
    const ref = this.selectedPayment?.referenceNumber;
    if (!ref) return;
    let message = 'Reference number copied';
    try {
      await navigator.clipboard.writeText(ref);
    } catch {
      message = "Couldn't copy. Press and hold the number to select it.";
    }
    const toast = await this.toastController.create({ message, duration: 2000, position: 'top' });
    await toast.present();
  }

  /** A separate tab gets the browser's own pinch-zoom (the app viewport disables it). */
  openReceipt() {
    const url = this.selectedPayment?.receiptUrl;
    if (url) window.open(url, '_blank', 'noopener');
  }

  /** The plain collection page address — never the "add payment" variant, never query/hash (spec 005, D2). */
  private shareUrl(): string {
    return `${window.location.origin}/clubs/${this.clubId}/collection/${this.collectionId}`;
  }

  /** Names and the plain address only — no amounts in a shared message (spec 005, D3/D4). */
  private sharePayload(): ShareData {
    const payload: ShareData = {
      title: this.collection?.name ?? 'Collection',
      url: this.shareUrl(),
    };
    if (this.clubName) payload.text = `A collection by ${this.clubName}`;
    return payload;
  }

  async shareCollection() {
    if (!this.collection) return;
    if (navigator.share) {
      try {
        await navigator.share(this.sharePayload());
        return;
      } catch (err) {
        // Closing the share sheet is a cancel, not an error (spec 005 edge case).
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Any other failure falls through to the copy fallback below.
      }
    }
    await this.copyShareLink();
  }

  /** No share facility (most desktop browsers): copy the address; if even that is blocked, show it (spec 005, FR-003). */
  private async copyShareLink() {
    const url = this.shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      const toast = await this.toastController.create({ message: 'Link copied', duration: 2000, position: 'top' });
      await toast.present();
    } catch {
      const alert = await this.alertController.create({
        header: 'Share this collection',
        message: url,
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  async deleteCollection() {
    const alert = await this.alertController.create({
      header: 'Delete Collection',
      message: `Delete "${this.collection?.name}"? This will also remove all associated payments and cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.collectionService.deleteCollection(this.collectionId).subscribe({
              next: async () => {
                const toast = await this.toastController.create({ message: 'Collection deleted', duration: 2000, color: 'success', position: 'top' });
                await toast.present();
                this.router.navigate(['/clubs', this.clubId], { queryParams: { tab: 'tools' } });
              },
              error: async (err) => {
                const msg = err?.error?.message || 'Failed to delete collection.';
                const toast = await this.toastController.create({ message: msg, duration: 3000, color: 'danger', position: 'top' });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
