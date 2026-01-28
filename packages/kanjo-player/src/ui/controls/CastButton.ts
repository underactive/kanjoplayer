/**
 * Google Cast button for streaming to Chromecast devices
 * Requires the Google Cast SDK to be loaded
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type { CastConfig } from '../../core/types';
import { UIBuilder } from '../UIBuilder';

// Google Cast SDK types
declare global {
  interface Window {
    chrome?: {
      cast?: {
        isAvailable?: boolean;
        SessionRequest: new (appId: string) => unknown;
        ApiConfig: new (
          sessionRequest: unknown,
          sessionListener: (session: CastSession) => void,
          receiverListener: (availability: string) => void
        ) => unknown;
        initialize: (
          apiConfig: unknown,
          successCallback: () => void,
          errorCallback: (error: unknown) => void
        ) => void;
        requestSession: (
          successCallback: (session: CastSession) => void,
          errorCallback: (error: unknown) => void
        ) => void;
        media: {
          DEFAULT_MEDIA_RECEIVER_APP_ID: string;
          MediaInfo: new (contentId: string, contentType: string) => MediaInfo;
          LoadRequest: new (mediaInfo: MediaInfo) => LoadRequest;
        };
      };
    };
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }
}

interface CastSession {
  loadMedia: (
    loadRequest: LoadRequest,
    successCallback: () => void,
    errorCallback: (error: unknown) => void
  ) => void;
  stop: (
    successCallback: () => void,
    errorCallback: (error: unknown) => void
  ) => void;
}

interface MediaInfo {
  contentId: string;
  contentType: string;
  streamType: string;
  metadata?: unknown;
}

interface LoadRequest {
  autoplay: boolean;
  currentTime: number;
}

export class CastButton {
  private element: HTMLButtonElement;
  private player: KanjoPlayer;
  private config: Required<CastConfig>;
  private isAvailable = false;
  private isConnected = false;
  private session: CastSession | null = null;
  private sdkLoaded = false;

  constructor(player: KanjoPlayer, config?: CastConfig) {
    this.player = player;
    this.config = {
      enabled: config?.enabled ?? false,
      receiverApplicationId:
        config?.receiverApplicationId ||
        (window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID ?? ''),
    };

    this.element = this.createButton();
    this.loadCastSDK();
  }

  private createButton(): HTMLButtonElement {
    const btn = UIBuilder.button({
      className: 'kanjo-cast-btn',
      icon: UIBuilder.icons.cast,
      tooltip: 'Cast',
      onClick: () => this.toggleCast(),
    });

    // Hidden by default until SDK is loaded and devices are available
    btn.style.display = 'none';

    return btn;
  }

  private loadCastSDK(): void {
    // Check if SDK is already loaded
    if (window.chrome?.cast?.isAvailable) {
      this.initializeCast();
      return;
    }

    // Set up callback for when SDK loads
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) {
        this.initializeCast();
      }
    };

    // Load the Cast SDK if not already present
    if (!document.querySelector('script[src*="cast_sender"]')) {
      const script = document.createElement('script');
      script.src =
        'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.head.appendChild(script);
    }
  }

  private initializeCast(): void {
    const chrome = window.chrome;
    if (!chrome?.cast) return;

    this.sdkLoaded = true;

    // Use default media receiver if no custom ID provided
    const appId =
      this.config.receiverApplicationId ||
      chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;

    const sessionRequest = new chrome.cast.SessionRequest(appId);
    const apiConfig = new chrome.cast.ApiConfig(
      sessionRequest,
      (session: CastSession) => this.onSessionConnected(session),
      (availability: string) => this.onReceiverAvailability(availability)
    );

    chrome.cast.initialize(
      apiConfig,
      () => {
        // Successfully initialized
      },
      (error: unknown) => {
        console.warn('Cast SDK initialization failed:', error);
      }
    );
  }

  private onReceiverAvailability(availability: string): void {
    this.isAvailable = availability === 'available';
    this.element.style.display = this.isAvailable ? '' : 'none';
  }

  private onSessionConnected(session: CastSession): void {
    this.session = session;
    this.isConnected = true;
    this.updateActiveState();
    this.loadMedia();
  }

  private toggleCast(): void {
    if (this.isConnected && this.session) {
      this.stopCasting();
    } else {
      this.startCasting();
    }
  }

  private startCasting(): void {
    const chrome = window.chrome;
    if (!chrome?.cast) return;

    chrome.cast.requestSession(
      (session: CastSession) => this.onSessionConnected(session),
      (error: unknown) => {
        console.warn('Cast session request failed:', error);
      }
    );
  }

  private stopCasting(): void {
    if (this.session) {
      this.session.stop(
        () => {
          this.session = null;
          this.isConnected = false;
          this.updateActiveState();
        },
        (error: unknown) => {
          console.warn('Failed to stop casting:', error);
        }
      );
    }
  }

  private loadMedia(): void {
    const chrome = window.chrome;
    if (!this.session || !chrome?.cast?.media) return;

    const src = this.player.getSrc();
    if (!src) return;

    // Determine content type
    let contentType = 'video/mp4';
    if (src.includes('.m3u8')) {
      contentType = 'application/x-mpegurl';
    } else if (src.includes('.webm')) {
      contentType = 'video/webm';
    }

    const mediaInfo = new chrome.cast.media.MediaInfo(src, contentType);
    const loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
    loadRequest.autoplay = !this.player.isPaused();
    loadRequest.currentTime = this.player.getCurrentTime();

    this.session.loadMedia(
      loadRequest,
      () => {
        // Media loaded successfully
        this.player.pause(); // Pause local playback
      },
      (error: unknown) => {
        console.warn('Failed to load media on Cast device:', error);
      }
    );
  }

  private updateActiveState(): void {
    const icon = this.isConnected
      ? UIBuilder.icons.castConnected
      : UIBuilder.icons.cast;
    const tooltip = this.isConnected ? 'Cast (Connected)' : 'Cast';

    this.element.innerHTML = icon;
    this.element.classList.toggle('kanjo-active', this.isConnected);
    this.element.title = tooltip;
    this.element.setAttribute('aria-label', tooltip);
  }

  getElement(): HTMLButtonElement {
    return this.element;
  }

  isSupported(): boolean {
    return this.sdkLoaded && this.isAvailable;
  }

  destroy(): void {
    if (this.isConnected) {
      this.stopCasting();
    }
  }
}
