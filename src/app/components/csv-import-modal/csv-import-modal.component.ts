import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  OfficialMemberService
} from '../../service/official-member.service';
import {
  NetworkService,
  NetworkStatus
} from '../../service/network.service';
import { ErrorService, ErrorInfo } from '../../service/error.service';
import { CSVImportResult } from '../../models/official-member.model';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-csv-import-modal',
  templateUrl: './csv-import-modal.component.html',
  styleUrls: ['./csv-import-modal.component.scss'],
})
export class CsvImportModalComponent implements OnInit, OnDestroy {
  // --- INPUTS/OUTPUTS ---
  @Input() clubId: string | null = null;
  @Output() onImportComplete = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();

  // --- STATE MANAGEMENT ---
  importForm: FormGroup;

  // File handling
  selectedFile: File | null = null;
  fileDropActive: boolean = false;

  // Import state
  isImporting: boolean = false;
  importProgress: number = 0;
  importResult: CSVImportResult | null = null;
  importError: string = '';
  currentError: ErrorInfo | null = null;

  // Network status
  networkStatus: NetworkStatus = { online: true };

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  constructor(
    private modalController: ModalController,
    private formBuilder: FormBuilder,
    private officialMemberService: OfficialMemberService,
    private networkService: NetworkService,
    private errorService: ErrorService
  ) {
    this.importForm = this.formBuilder.group({
      file: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.setupNetworkMonitoring();
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // --- SETUP METHODS ---

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring() {
    const networkSub = this.networkService.networkStatus.subscribe(
      (status) => {
        this.networkStatus = status;
      }
    );

    this.subscriptions.push(networkSub);
  }

  // --- FILE HANDLING METHODS ---

  /**
   * Handle file selection via file input
   */
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  /**
   * Handle file drop
   */
  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileDropActive = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  /**
   * Handle drag over
   */
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileDropActive = true;
  }

  /**
   * Handle drag leave
   */
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileDropActive = false;
  }

  /**
   * Process selected file
   */
  private handleFile(file: File) {
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      this.importError = 'Please select a CSV file';
      this.showErrorToast('Please select a CSV file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.importError = 'File size must be less than 5MB';
      this.showErrorToast('File size must be less than 5MB');
      return;
    }

    this.selectedFile = file;
    this.importError = '';
    this.importResult = null;
    this.importForm.patchValue({ file });
  }

  /**
   * Remove selected file
   */
  removeFile() {
    this.selectedFile = null;
    this.importForm.patchValue({ file: null });
    this.importError = '';
    this.importResult = null;
  }

  // --- IMPORT METHODS ---

  /**
   * Start CSV import process
   */
  async startImport() {
    if (!this.clubId || !this.selectedFile) {
      this.showErrorToast('Please select a file to import');
      return;
    }

    if (!this.networkStatus.online) {
      this.showErrorToast('No internet connection. Please check your connection and try again.');
      return;
    }

    this.isImporting = true;
    this.importProgress = 0;
    this.importError = '';
    this.importResult = null;

    // Simulate progress
    this.simulateProgress();

    this.officialMemberService.importFromCSV(this.clubId, this.selectedFile).pipe(
      finalize(() => {
        this.isImporting = false;
        this.importProgress = 100;
      })
    ).subscribe({
      next: (result) => {
        this.importResult = result;
        this.showSuccessToast(`Import complete: ${result.results.successful} successful, ${result.results.failed} failed`);
      },
      error: (error) => {
        console.error('Error importing CSV:', error);
        const errorInfo = this.errorService.analyzeError(error, 'CSV Import');
        this.currentError = errorInfo;
        this.importError = errorInfo.userMessage;
        this.showErrorToast(this.errorService.createErrorMessage(errorInfo));
      }
    });
  }

  /**
   * Simulate import progress
   */
  private simulateProgress() {
    const intervals = [
      { progress: 20, delay: 500 },
      { progress: 40, delay: 1000 },
      { progress: 60, delay: 1500 },
      { progress: 80, delay: 2000 },
      { progress: 95, delay: 2500 }
    ];

    intervals.forEach(({ progress, delay }) => {
      setTimeout(() => {
        if (this.isImporting) {
          this.importProgress = progress;
        }
      }, delay);
    });
  }

  // --- TEMPLATE METHODS ---

  /**
   * Download CSV template
   */
  downloadTemplate() {
    const csvContent = `firstName,lastName,officialNumber,address,plateNumber,description
John,Doe,001,"123 Main St, City, State","ABC-1234","Sample member with official number"
Jane,Smith,,"456 Oak Ave, City, State","XYZ-5678","Official number will be auto-generated"
Mike,Johnson,003,,,"Member with only required field and official number"
Sarah,,,"789 Pine Rd, City, State",,"Only firstName is required - lastName and officialNumber auto-generated"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'official-members-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.showSuccessToast('Template downloaded successfully');
  }

  /**
   * Complete import and close modal
   */
  completeImport() {
    this.modalController.dismiss(this.importResult);
  }

  /**
   * Cancel import
   */
  cancelImport() {
    this.modalController.dismiss(null);
  }

  /**
   * Close modal
   */
  closeModal() {
    this.modalController.dismiss(null);
  }

  // --- UTILITY METHODS ---

  /**
   * Check if import was successful
   */
  get isImportSuccessful(): boolean {
    return this.importResult !== null && this.importResult.results.failed === 0;
  }

  /**
   * Check if import had errors
   */
  get hasImportErrors(): boolean {
    return this.importResult !== null && this.importResult.results.failed > 0;
  }

  /**
   * Check if can start import
   */
  get canStartImport(): boolean {
    return !this.isImporting &&
           !this.importResult &&
           this.selectedFile !== null &&
           this.networkStatus.online;
  }

  /**
   * Get file display name
   */
  get fileName(): string {
    return this.selectedFile?.name || '';
  }

  /**
   * Get file size display
   */
  get fileSize(): string {
    if (!this.selectedFile) return '';

    const bytes = this.selectedFile.size;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Show error toast
   */
  private async showErrorToast(message: string) {
    const toast = await this.modalController.getTop();
    if (toast) {
      // Use toast controller instead
    }
  }

  /**
   * Show success toast
   */
  private async showSuccessToast(message: string) {
    // Toast notification would be handled by toast controller
  }
}
