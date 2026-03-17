import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { CollectionService, Collection } from '../../../service/collection.service';
import { PaymentService, Payment } from '../../../service/payment.service';
import { UserStateService } from '../../../service/user-state.service';
import { ClubService } from '../../../service/club.service';

@Component({
  selector: 'app-collection-detail',
  templateUrl: './collection-detail.page.html',
  styleUrls: ['./collection-detail.page.scss'],
})
export class CollectionDetailPage implements OnInit {
  clubId: string = '';
  collectionId: string = '';

  collection: Collection | null = null;
  collectionLoading = false;

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

  get clubName(): string | null {
    return this.collection?.clubName || null;
  }

  get totalCollected(): number {
    return this.payments.reduce((s, p) => s + p.amount, 0);
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

  loadCollection(autoOpenPayment = false) {
    this.collectionLoading = true;
    this.collectionService.getCollections(this.clubId).subscribe({
      next: (res) => {
        this.collection = res.collections.find(c => c._id === this.collectionId) || null;
        this.collectionLoading = false;
        if (!this.collection) {
          this.accessDenied = true;
        } else if (autoOpenPayment) {
          this.openAddPaymentModal();
        }
      },
      error: () => { this.collectionLoading = false; }
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
        if (this.collection) {
          this.collection.totalCollected += res.payment.amount;
          this.collection.paymentCount += 1;
        }
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

  async changeStatus(payment: Payment) {
    const alert = await this.alertController.create({
      header: 'Update Status',
      inputs: [
        { type: 'radio', label: 'Pending',   value: 'pending',   checked: payment.status === 'pending' },
        { type: 'radio', label: 'Confirmed', value: 'confirmed', checked: payment.status === 'confirmed' },
        { type: 'radio', label: 'Rejected',  value: 'rejected',  checked: payment.status === 'rejected' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (status: 'pending' | 'confirmed' | 'rejected') => {
            if (!status || status === payment.status) return;
            this.paymentService.updateStatus(payment._id, status).subscribe({
              next: (res) => { payment.status = res.payment.status; },
              error: async () => {
                const toast = await this.toastController.create({ message: 'Failed to update status', duration: 2000, color: 'danger' });
                await toast.present();
              }
            });
          }
        }
      ]
    });
    await alert.present();
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

  async deletePayment(payment: Payment) {
    const alert = await this.alertController.create({
      header: 'Delete Payment',
      message: `Remove payment from ${payment.name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.paymentService.deletePayment(payment._id).subscribe({
              next: () => {
                this.payments = this.payments.filter(p => p._id !== payment._id);
                if (this.collection) {
                  this.collection.totalCollected -= payment.amount;
                  this.collection.paymentCount -= 1;
                }
              },
              error: async () => {
                const toast = await this.toastController.create({ message: 'Failed to delete payment', duration: 2000, color: 'danger' });
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
