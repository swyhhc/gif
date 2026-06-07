import type { ExportSettings } from './settings';

export type VideoMetadata = {
  duration: number;
  width: number;
  height: number;
};

export type ExtractedFrame = {
  imageData: ImageData;
  time: number;
};

export function validateVideoMetadata(metadata: VideoMetadata): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) {
    return { ok: false, message: '无法读取视频时长。' };
  }

  if (metadata.duration > 10) {
    return { ok: false, message: '视频最长支持 10 秒。' };
  }

  if (metadata.width <= 0 || metadata.height <= 0) {
    return { ok: false, message: '无法读取视频尺寸。' };
  }

  return { ok: true };
}

export function getFrameTimes(duration: number, fps: number): number[] {
  const frameCount = Math.floor(duration * fps);
  return Array.from({ length: frameCount }, (_, index) => Number((index / fps).toFixed(3)));
}

export function getScaledSize(width: number, height: number, longestEdge: number) {
  const scale = longestEdge / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function waitForEvent<T extends Event>(target: EventTarget, eventName: string): Promise<T> {
  return new Promise((resolve) => {
    target.addEventListener(eventName, (event) => resolve(event as T), { once: true });
  });
}

function createVideoElement(file: File): { video: HTMLVideoElement; url: string } {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  return { video, url };
}

export async function loadVideoMetadata(file: File): Promise<VideoMetadata> {
  const { video, url } = createVideoElement(file);

  try {
    await waitForEvent(video, 'loadedmetadata');
    return {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function captureFirstFrame(file: File, longestEdge = 480): Promise<ImageData> {
  const { video, url } = createVideoElement(file);

  try {
    await waitForEvent(video, 'loadedmetadata');
    video.currentTime = 0;
    await waitForEvent(video, 'seeked');
    const size = getScaledSize(video.videoWidth, video.videoHeight, longestEdge);
    return drawVideoFrame(video, size.width, size.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractVideoFrames(file: File, settings: ExportSettings): Promise<ExtractedFrame[]> {
  const { video, url } = createVideoElement(file);

  try {
    await waitForEvent(video, 'loadedmetadata');
    const validation = validateVideoMetadata({
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    });

    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const size = getScaledSize(video.videoWidth, video.videoHeight, settings.longestEdge);
    const frameTimes = getFrameTimes(video.duration, settings.fps);
    const frames: ExtractedFrame[] = [];

    for (const time of frameTimes) {
      video.currentTime = time;
      await waitForEvent(video, 'seeked');
      frames.push({ time, imageData: drawVideoFrame(video, size.width, size.height) });
    }

    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawVideoFrame(video: HTMLVideoElement, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not available.');
  }

  context.drawImage(video, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}
