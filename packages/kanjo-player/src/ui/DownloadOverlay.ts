/**
 * Download Overlay - Shows download progress and confirmation dialog
 */

import { UIBuilder } from './UIBuilder';
import type { LocaleManager } from '../i18n/LocaleManager';

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
  private locale: LocaleManager | null = null;
  private unsubscribeLocale?: () => void;

  constructor(container: HTMLElement) {
    // Create progress indicator (top-right corner)
    this.progressContainer = this.createProgressContainer();
    this.progressBar = this.progressContainer.querySelector('.kanjo-download-progress-bar')!;
    this.progressText = this.progressContainer.querySelector('.kanjo-download-progress-text')!;

    // Create dialog overlay (center)
    this.dialogOverlay = this.createDialogOverlay();

    // Main element wrapper
    this.element = UIBuilder.create({ className: 'kanjo-download-overlay' });
    this.element.appendChild(this.progressContainer);
    this.element.appendChild(this.dialogOverlay);

    // Append to container
    container.appendChild(this.element);
  }

  /**
   * Set the locale manager for i18n support
   */
  setLocaleManager(locale: LocaleManager): void {
    this.locale = locale;
    this.unsubscribeLocale = locale.onChange(() => this.updateStrings());
    this.updateStrings();
  }

  private createProgressContainer(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-download-progress-container',
      html: `
        <div class="kanjo-download-progress-content">
          <div class="kanjo-download-progress-text">Preparing download...</div>
          <div class="kanjo-download-progress-track">
            <div class="kanjo-download-progress-bar"></div>
          </div>
        </div>
        <button class="kanjo-download-progress-close" title="Cancel download">
          ${UIBuilder.icons.close}
        </button>
      `,
    });

    // Bind close button event
    const closeBtn = container.querySelector('.kanjo-download-progress-close')!;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleProgressCancel();
    });

    return container;
  }

  private createDialogOverlay(): HTMLElement {
    const overlay = UIBuilder.create({
      className: 'kanjo-download-dialog-overlay',
      html: `
        <div class="kanjo-download-dialog">
          <div class="kanjo-download-dialog-icon">
            ${UIBuilder.icons.download}
          </div>
          <div class="kanjo-download-dialog-title">Download Ready</div>
          <div class="kanjo-download-dialog-message">Your clip is ready. Do you want to download it?</div>
          <div class="kanjo-download-dialog-buttons">
            <button class="kanjo-download-dialog-btn kanjo-download-dialog-btn-cancel">Cancel</button>
            <button class="kanjo-download-dialog-btn kanjo-download-dialog-btn-download">Download</button>
          </div>
        </div>
      `,
    });

    // Bind button events
    const cancelBtn = overlay.querySelector('.kanjo-download-dialog-btn-cancel')!;
    const downloadBtn = overlay.querySelector('.kanjo-download-dialog-btn-download')!;

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
    this.progressContainer.classList.add('kanjo-visible');
    this.onCancel = onCancel || null;

    if (progress.progress < 0) {
      // Indeterminate progress - show barber pole animation
      this.progressBar.style.width = '100%';
      this.progressContainer.classList.add('kanjo-indeterminate');
    } else {
      // Determinate progress
      this.progressBar.style.width = `${progress.progress}%`;
      this.progressContainer.classList.remove('kanjo-indeterminate');
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
    this.progressContainer.classList.remove('kanjo-visible');
    this.progressContainer.classList.remove('kanjo-indeterminate');
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
    const sizeText = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    const message = this.dialogOverlay.querySelector('.kanjo-download-dialog-message')!;
    if (this.locale) {
      message.textContent = this.locale.t('download.readyMessage', { size: sizeText });
    } else {
      message.textContent = `Your clip (${sizeText}) is ready. Do you want to download it?`;
    }

    // Hide progress, show dialog
    this.hideProgress();
    this.dialogOverlay.classList.add('kanjo-visible');
  }

  /**
   * Hide the dialog
   */
  hideDialog(): void {
    this.dialogOverlay.classList.remove('kanjo-visible');
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
    this.progressContainer.classList.add('kanjo-visible');
    this.progressContainer.classList.add('kanjo-error');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideProgress();
      this.progressContainer.classList.remove('kanjo-error');
    }, 3000);
  }

  private updateStrings(): void {
    if (!this.locale) return;

    // Update progress container text
    const progressText = this.progressContainer.querySelector('.kanjo-download-progress-text');
    // Only update if it's still showing the default/preparing text
    if (progressText && progressText.textContent === 'Preparing download...') {
      progressText.textContent = this.locale.get('download.preparing');
    }

    // Update progress close button title
    const closeBtn = this.progressContainer.querySelector(
      '.kanjo-download-progress-close'
    ) as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.title = this.locale.get('download.cancelDownload');
    }

    // Update dialog title
    const dialogTitle = this.dialogOverlay.querySelector('.kanjo-download-dialog-title');
    if (dialogTitle) {
      dialogTitle.textContent = this.locale.get('download.ready');
    }

    // Update dialog buttons
    const cancelBtn = this.dialogOverlay.querySelector('.kanjo-download-dialog-btn-cancel');
    if (cancelBtn) {
      cancelBtn.textContent = this.locale.get('download.cancel');
    }

    const downloadBtn = this.dialogOverlay.querySelector('.kanjo-download-dialog-btn-download');
    if (downloadBtn) {
      downloadBtn.textContent = this.locale.get('download.download');
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.unsubscribeLocale?.();
  }
}
