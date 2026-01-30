/**
 * Codec Capabilities Detection
 * Provides sync and async methods to detect codec support in the browser
 */

import type { VideoCodec, VideoContainer, CodecSupport, CodecCapabilitiesResult } from './types';

// Codec strings for MediaSource.isTypeSupported() and MediaCapabilities API
const CODEC_STRINGS: Record<VideoCodec, Record<VideoContainer, string>> = {
  h264: {
    mp4: 'video/mp4; codecs="avc1.42E01E"', // Baseline profile
    webm: 'video/webm; codecs="avc1.42E01E"', // Not common but check anyway
  },
  h265: {
    mp4: 'video/mp4; codecs="hvc1.1.6.L93.B0"', // HEVC Main profile
    webm: 'video/webm; codecs="hvc1.1.6.L93.B0"',
  },
  vp9: {
    mp4: 'video/mp4; codecs="vp09.00.10.08"', // VP9 profile 0
    webm: 'video/webm; codecs="vp9"',
  },
  av1: {
    mp4: 'video/mp4; codecs="av01.0.01M.08"', // AV1 Main profile
    webm: 'video/webm; codecs="av01.0.01M.08"',
  },
};

// For MediaCapabilities API
const MEDIA_CAPABILITIES_CONFIG: Record<
  VideoCodec,
  Record<
    VideoContainer,
    { contentType: string; width: number; height: number; bitrate: number; framerate: number }
  >
> = {
  h264: {
    mp4: {
      contentType: 'video/mp4; codecs="avc1.42E01E"',
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    },
    webm: {
      contentType: 'video/webm; codecs="avc1.42E01E"',
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    },
  },
  h265: {
    mp4: {
      contentType: 'video/mp4; codecs="hvc1.1.6.L93.B0"',
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    },
    webm: {
      contentType: 'video/webm; codecs="hvc1.1.6.L93.B0"',
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    },
  },
  vp9: {
    mp4: {
      contentType: 'video/mp4; codecs="vp09.00.10.08"',
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    },
    webm: {
      contentType: 'video/webm; codecs="vp9"',
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    },
  },
  av1: {
    mp4: {
      contentType: 'video/mp4; codecs="av01.0.01M.08"',
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    },
    webm: {
      contentType: 'video/webm; codecs="av01.0.01M.08"',
      width: 1920,
      height: 1080,
      bitrate: 5000000,
      framerate: 30,
    },
  },
};

// Cache for capability results
let cachedCapabilities: CodecCapabilitiesResult | null = null;

/**
 * Synchronously check if a codec/container combination is supported
 * Uses MediaSource.isTypeSupported() which is available in most browsers
 */
export function isSupported(codec: VideoCodec, container: VideoContainer = 'mp4'): boolean {
  const codecString = CODEC_STRINGS[codec]?.[container];
  if (!codecString) return false;

  // Try MediaSource.isTypeSupported first (most reliable for MSE playback)
  if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported) {
    return MediaSource.isTypeSupported(codecString);
  }

  // Fallback to video element canPlayType
  try {
    const video = document.createElement('video');
    const result = video.canPlayType(codecString);
    return result === 'probably' || result === 'maybe';
  } catch {
    return false;
  }
}

/**
 * Get detailed support information using MediaCapabilities API
 * Returns smooth and powerEfficient flags when available
 */
export async function getDetailedSupport(
  codec: VideoCodec,
  container: VideoContainer = 'mp4'
): Promise<CodecSupport> {
  const basicSupport = isSupported(codec, container);

  const result: CodecSupport = {
    codec,
    container,
    supported: basicSupport,
  };

  // Try MediaCapabilities API for detailed info
  if (basicSupport && 'mediaCapabilities' in navigator) {
    const config = MEDIA_CAPABILITIES_CONFIG[codec]?.[container];
    if (config) {
      try {
        const capabilities = await navigator.mediaCapabilities.decodingInfo({
          type: 'media-source',
          video: config,
        });
        result.supported = capabilities.supported;
        result.smooth = capabilities.smooth;
        result.powerEfficient = capabilities.powerEfficient;
      } catch {
        // MediaCapabilities failed, use basic support
      }
    }
  }

  return result;
}

/**
 * Get all codec capabilities (cached after first call)
 */
export async function getAllCapabilities(): Promise<CodecCapabilitiesResult> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const codecs: VideoCodec[] = ['h264', 'h265', 'vp9', 'av1'];
  const containers: VideoContainer[] = ['mp4', 'webm'];
  const results: CodecSupport[] = [];

  // Check all combinations
  const promises: Promise<CodecSupport>[] = [];
  for (const codec of codecs) {
    for (const container of containers) {
      promises.push(getDetailedSupport(codec, container));
    }
  }

  const supportResults = await Promise.all(promises);
  results.push(...supportResults);

  // Determine preferred codec based on support, efficiency, and quality
  let preferredCodec: VideoCodec | null = null;

  // Priority: AV1 > VP9 > H265 > H264 (if supported and efficient)
  const codecPriority: VideoCodec[] = ['av1', 'vp9', 'h265', 'h264'];

  for (const codec of codecPriority) {
    // Check if codec is supported in at least one container
    const codecResults = results.filter((r) => r.codec === codec && r.supported);
    if (codecResults.length > 0) {
      // Prefer codecs that are power efficient
      const efficient = codecResults.find((r) => r.powerEfficient);
      if (efficient || codecResults.length > 0) {
        preferredCodec = codec;
        break;
      }
    }
  }

  cachedCapabilities = {
    codecs: results,
    preferredCodec,
  };

  return cachedCapabilities;
}

/**
 * Clear cached capabilities (useful for testing or re-detection)
 */
export function clearCache(): void {
  cachedCapabilities = null;
}

/**
 * Get codec string for a given codec/container combination
 * Useful for external tools that need the MIME type
 */
export function getCodecString(codec: VideoCodec, container: VideoContainer): string | null {
  return CODEC_STRINGS[codec]?.[container] ?? null;
}

// Export as namespace for convenient usage
export const CodecCapabilities = {
  isSupported,
  getDetailedSupport,
  getAllCapabilities,
  clearCache,
  getCodecString,
};
