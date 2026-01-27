/**
 * Download Overlay - Shows download progress and confirmation dialog
 */

import { UIBuilder } from './UIBuilder';

export interface DownloadProgress {
  phase: string;
  progress: number;
  message: string;
}

export class DownloadOverlay {
  private element: HTMLElement;
  private progressContainer: HTMLElement;
  private progressBar: HTMLElement;
  private progressText: HTMLElement;
  private dialogOverlay: HTMLElement;
  private pendingBlob: Blob | null = null;
  private pendingFilename: string = '';
  private onCleanup: (() => void) | null = null;
  private onCancel: (() => void) | null = null;

  constructor(container: HTMLElement) {
    // Create progress indicator (top-right corner)
    this.progressContainer = this.createProgressContainer();
    this.progressBar = this.progressContainer.querySelector('.kimochi-download-progress-bar')!;
    this.progressText = this.progressContainer.querySelector('.kimochi-download-progress-text')!;

    // Create dialog overlay (center)
    this.dialogOverlay = this.createDialogOverlay();

    // Main element wrapper
    this.element = UIBuilder.create({ className: 'kimochi-download-overlay' });
    this.element.appendChild(this.progressContainer);
    this.element.appendChild(this.dialogOverlay);

    // Append to container
    container.appendChild(this.element);
  }

  private createProgressContainer(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kimochi-download-progress-container',
      html: `
        <div class="kimochi-download-progress-content">
          <div class="kimochi-download-progress-text">Preparing download...</div>
          <div class="kimochi-download-progress-track">
            <div class="kimochi-download-progress-bar"></div>
          </div>
        </div>
        <button class="kimochi-download-progress-close" title="Cancel download">
          ${UIBuilder.icons.close}
        </button>
      `,
    });

    // Bind close button event
    const closeBtn = container.querySelector('.kimochi-download-progress-close')!;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleProgressCancel();
    });

    return container;
  }

  private createDialogOverlay(): HTMLElement {
    const overlay = UIBuilder.create({
      className: 'kimochi-download-dialog-overlay',
      html: `
        <div class="kimochi-download-dialog">
          <div class="kimochi-download-dialog-icon">
            ${UIBuilder.icons.download}
          </div>
          <div class="kimochi-download-dialog-title">Download Ready</div>
          <div class="kimochi-download-dialog-message">Your clip is ready. Do you want to download it?</div>
          <div class="kimochi-download-dialog-buttons">
            <button class="kimochi-download-dialog-btn kimochi-download-dialog-btn-cancel">Cancel</button>
            <button class="kimochi-download-dialog-btn kimochi-download-dialog-btn-download">Download</button>
          </div>
        </div>
      `,
    });

    // Bind button events
    const cancelBtn = overlay.querySelector('.kimochi-download-dialog-btn-cancel')!;
    const downloadBtn = overlay.querySelector('.kimochi-download-dialog-btn-download')!;

    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleCancel();
    });

    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDownload();
    });

    // Close on overlay click (outside dialog)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.handleCancel();
      }
    });

    return overlay;
  }

  /**
   * Show progress indicator
   */
  showProgress(progress: DownloadProgress, onCancel?: () => void): void {
    this.progressContainer.classList.add('kimochi-visible');
    this.onCancel = onCancel || null;

    if (progress.progress < 0) {
      // Indeterminate progress - show barber pole animation
      this.progressBar.style.width = '100%';
      this.progressContainer.classList.add('kimochi-indeterminate');
    } else {
      // Determinate progress
      this.progressBar.style.width = `${progress.progress}%`;
      this.progressContainer.classList.remove('kimochi-indeterminate');
    }

    this.progressText.textContent = progress.message;
  }

  /**
   * Handle progress cancel button click
   */
  private handleProgressCancel(): void {
    if (this.onCancel) {
      this.onCancel();
    }
    this.hideProgress();
  }

  /**
   * Hide progress indicator
   */
  hideProgress(): void {
    this.progressContainer.classList.remove('kimochi-visible');
    this.progressContainer.classList.remove('kimochi-indeterminate');
  }

  /**
   * Show the download confirmation dialog
   */
  showDialog(blob: Blob, filename: string, onCleanup?: () => void): void {
    this.pendingBlob = blob;
    this.pendingFilename = filename;
    this.onCleanup = onCleanup || null;

    // Update dialog message with file size
    const sizeKB = Math.round(blob.size / 1024);
    const sizeText = sizeKB > 1024
      ? `${(sizeKB / 1024).toFixed(1)} MB`
      : `${sizeKB} KB`;

    const message = this.dialogOverlay.querySelector('.kimochi-download-dialog-message')!;
    message.textContent = `Your clip (${sizeText}) is ready. Do you want to download it?`;

    // Hide progress, show dialog
    this.hideProgress();
    this.dialogOverlay.classList.add('kimochi-visible');
  }

  /**
   * Hide the dialog
   */
  hideDialog(): void {
    this.dialogOverlay.classList.remove('kimochi-visible');
  }

  /**
   * Handle download button click
   */
  private handleDownload(): void {
    if (this.pendingBlob) {
      this.triggerDownload(this.pendingBlob, this.pendingFilename);
    }
    this.cleanup();
    this.hideDialog();
  }

  /**
   * Handle cancel button click
   */
  private handleCancel(): void {
    this.cleanup();
    this.hideDialog();
  }

  /**
   * Trigger browser download
   */
  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Clean up pending download data
   */
  private cleanup(): void {
    this.pendingBlob = null;
    this.pendingFilename = '';
    if (this.onCleanup) {
      this.onCleanup();
      this.onCleanup = null;
    }
  }

  /**
   * Show error state
   */
  showError(message: string): void {
    this.progressText.textContent = message;
    this.progressContainer.classList.add('kimochi-error');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideProgress();
      this.progressContainer.classList.remove('kimochi-error');
    }, 3000);
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
