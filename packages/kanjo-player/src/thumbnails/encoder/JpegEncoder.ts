/**
 * WASM-based JPEG encoder using @jsquash/jpeg (MozJPEG)
 * Provides faster thumbnail encoding via WebAssembly
 * Falls back to canvas.toDataURL() when WASM is unavailable
 */

// Type for the dynamically imported @jsquash/jpeg module
interface JsquashJpeg {
  encode: (imageData: ImageData, options?: { quality?: number }) => Promise<ArrayBuffer>;
}

/**
 * Singleton JPEG encoder with WASM acceleration
 */
export class JpegEncoder {
  private static instance: JpegEncoder | null = null;

  private encoder: JsquashJpeg | null = null;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private useFallback = false;
  private lastActiveTime = 0;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly INACTIVITY_TIMEOUT = 30000; // 30 seconds

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): JpegEncoder {
    if (!JpegEncoder.instance) {
      JpegEncoder.instance = new JpegEncoder();
    }
    return JpegEncoder.instance;
  }

  /**
   * Check if WASM encoding is likely supported
   */
  static isSupported(): boolean {
    return typeof WebAssembly !== 'undefined';
  }

  /**
   * Load the WASM encoder module
   */
  private async loadEncoder(): Promise<void> {
    if (this.encoder || this.useFallback) return;
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    if (!JpegEncoder.isSupported()) {
      console.debug('[JpegEncoder] WebAssembly not supported, using fallback');
      this.useFallback = true;
      return;
    }

    this.isLoading = true;

    this.loadPromise = (async () => {
      try {
        // Dynamic import of @jsquash/jpeg
        const jpeg = await import('@jsquash/jpeg');
        this.encoder = jpeg as JsquashJpeg;
        this.lastActiveTime = Date.now();
        this.startInactivityTimer();
        console.debug('[JpegEncoder] WASM encoder loaded');
      } catch (error) {
        console.warn('[JpegEncoder] Failed to load WASM encoder, using fallback:', error);
        this.useFallback = true;
      } finally {
        this.isLoading = false;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Start timer to release encoder after inactivity
   */
  private startInactivityTimer(): void {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
    }

    this.releaseTimer = setTimeout(() => {
      if (this.encoder && Date.now() - this.lastActiveTime >= JpegEncoder.INACTIVITY_TIMEOUT) {
        console.debug('[JpegEncoder] Auto-releasing due to inactivity');
        this.encoder = null;
        this.loadPromise = null;
      } else if (this.encoder) {
        // Still active, restart timer
        this.startInactivityTimer();
      }
    }, JpegEncoder.INACTIVITY_TIMEOUT);
  }

  /**
   * Encode ImageData to JPEG data URL
   * @param imageData - Canvas ImageData to encode
   * @param quality - JPEG quality (1-100)
   * @returns Promise resolving to data URL or blob URL string
   */
  async encode(imageData: ImageData, quality: number = 70): Promise<string> {
    // Load encoder if needed
    if (!this.encoder && !this.useFallback) {
      await this.loadEncoder();
    }

    // Update activity time
    this.lastActiveTime = Date.now();

    // Use fallback if WASM not available
    if (this.useFallback || !this.encoder) {
      return this.encodeFallback(imageData, quality);
    }

    try {
      // Encode using MozJPEG WASM
      const jpegBuffer = await this.encoder.encode(imageData, { quality });

      // Create blob URL (more efficient than base64 data URL)
      const blob = new Blob([jpegBuffer], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      // Permanently switch to fallback after first failure
      console.warn('[JpegEncoder] WASM encode failed, switching to fallback permanently:', error);
      this.useFallback = true;
      this.encoder = null;
      return this.encodeFallback(imageData, quality);
    }
  }

  /**
   * Fallback encoding using canvas toDataURL
   */
  private encodeFallback(imageData: ImageData, quality: number): string {
    // Create temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', quality / 100);
  }

  /**
   * Release resources
   */
  destroy(): void {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    this.encoder = null;
    this.isLoading = false;
    this.useFallback = false;
    this.loadPromise = null;
    JpegEncoder.instance = null;
  }
}
