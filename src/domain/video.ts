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

export function getPreviewFrameTime(duration: number): number {
  return Number(Math.min(0.05, duration / 2).toFixed(3));
}

export function waitForEventWithTimeout<T extends Event>(
  target: EventTarget,
  eventName: string,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      target.removeEventListener(eventName, onEvent);
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    function onEvent(event: Event) {
      window.clearTimeout(timeoutId);
      resolve(event as T);
    }

    target.addEventListener(eventName, onEvent, { once: true });
  });
}

function waitForAnyEventWithTimeout(
  target: EventTarget,
  eventNames: string[],
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timeoutId);
      for (const eventName of eventNames) {
        target.removeEventListener(eventName, onEvent);
      }
    }

    function onEvent(event: Event) {
      cleanup();
      resolve(event);
    }

    for (const eventName of eventNames) {
      target.addEventListener(eventName, onEvent);
    }
  });
}

export function waitForConditionWithEvents(
  target: EventTarget,
  eventNames: string[],
  condition: () => boolean,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (condition()) {
      resolve();
      return;
    }

    const intervalId = window.setInterval(check, 120);
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    function cleanup() {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      for (const eventName of eventNames) {
        target.removeEventListener(eventName, check);
      }
    }

    function check() {
      if (!condition()) return;
      cleanup();
      resolve();
    }

    for (const eventName of eventNames) {
      target.addEventListener(eventName, check);
    }
  });
}

function createVideoElement(file: File): { video: HTMLVideoElement; url: string; cleanup(): void } {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.controls = false;
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '0';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.opacity = '0';
  video.src = url;
  document.body.appendChild(video);
  video.load();
  return {
    video,
    url,
    cleanup() {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
    },
  };
}

export async function loadVideoMetadata(file: File): Promise<VideoMetadata> {
  const { video, cleanup } = createVideoElement(file);

  try {
    await waitForVideoMetadata(video);
    await waitForDrawableFrame(video);
    return {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  } finally {
    cleanup();
  }
}

export async function captureFirstFrame(file: File, longestEdge = 480): Promise<ImageData> {
  const { video, cleanup } = createVideoElement(file);

  try {
    await waitForVideoMetadata(video);
    await waitForDrawableFrame(video);
    await seekVideo(video, getPreviewFrameTime(video.duration));
    const size = getScaledSize(video.videoWidth, video.videoHeight, longestEdge);
    return drawVideoFrame(video, size.width, size.height);
  } finally {
    cleanup();
  }
}

export async function extractVideoFrames(file: File, settings: ExportSettings): Promise<ExtractedFrame[]> {
  const { video, cleanup } = createVideoElement(file);

  try {
    await waitForVideoMetadata(video);
    await waitForDrawableFrame(video);
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
      await seekVideo(video, time);
      frames.push({ time, imageData: drawVideoFrame(video, size.width, size.height) });
    }

    return frames;
  } finally {
    cleanup();
  }
}

async function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  const seeked = waitForEventWithTimeout(video, 'seeked', 5000, '定位视频帧超时，请重新选择视频。');
  video.currentTime = time;
  await seeked;
}

async function waitForDrawableFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  await waitForConditionWithEvents(
    video,
    ['loadeddata', 'canplay', 'canplaythrough', 'timeupdate'],
    () => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
    20000,
    '读取视频画面超时，请重新选择。',
  );
}

async function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }

  await waitForConditionWithEvents(
    video,
    ['loadedmetadata', 'durationchange', 'loadeddata', 'canplay'],
    () => video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0,
    20000,
    '读取视频信息超时，请重新选择。',
  );
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
