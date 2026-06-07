# Transparent Video GIF Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first browser app that turns a short uploaded video into a transparent-background GIF after the user box-selects the subject on the first frame.

**Architecture:** A Vite + React single-page app owns the workflow UI. Focused browser utilities handle video validation/frame extraction, subject selection geometry, MediaPipe segmentation, RGBA mask composition, transparent GIF encoding, and IndexedDB history. The app stays fully client-side and never uploads user video.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, `@mediapipe/tasks-vision`, `gifenc`, IndexedDB, Canvas API, Web Workers where feasible.

---

## Source Spec

Implement from `docs/superpowers/specs/2026-06-07-transparent-video-gif-design.md`.

Reference docs:

- MediaPipe Interactive Image Segmenter: https://ai.google.dev/edge/mediapipe/solutions/vision/interactive_segmenter/web_js
- gifenc npm package: https://www.npmjs.com/package/gifenc

## Planned File Structure

- Create `package.json`: scripts and dependencies.
- Create `index.html`: app mount point.
- Create `vite.config.ts`: Vite and Vitest config.
- Create `tsconfig.json`: TypeScript settings.
- Create `src/main.tsx`: React entry.
- Create `src/App.tsx`: workflow orchestration.
- Create `src/styles.css`: mobile-first tool UI.
- Create `src/domain/settings.ts`: export presets and validation.
- Create `src/domain/video.ts`: video metadata validation and frame extraction.
- Create `src/domain/selection.ts`: subject rectangle math.
- Create `src/domain/mask.ts`: alpha thresholding, clipping, and RGBA composition.
- Create `src/domain/gif.ts`: transparent GIF encoding.
- Create `src/domain/history.ts`: IndexedDB export history.
- Create `src/mediapipe/interactiveSegmenter.ts`: MediaPipe model loading and frame segmentation adapter.
- Create `src/components/UploadStep.tsx`: upload UI.
- Create `src/components/SelectionStep.tsx`: first-frame canvas and rectangle selection.
- Create `src/components/SettingsStep.tsx`: export controls.
- Create `src/components/ProcessingStep.tsx`: progress and cancel UI.
- Create `src/components/ResultStep.tsx`: preview, save, retry, history.
- Create `src/__tests__/settings.test.ts`: settings validation tests.
- Create `src/__tests__/selection.test.ts`: selection geometry tests.
- Create `src/__tests__/mask.test.ts`: transparency composition tests.
- Create `src/__tests__/history.test.ts`: history limit tests with fake IndexedDB.

## Task 1: Scaffold the Web App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "transparent-video-gif-tool",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.20",
    "@vitejs/plugin-react": "^4.3.4",
    "gifenc": "^1.0.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create app shell files**

`index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>透明动图工具</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.ts'],
  },
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": []
}
```

- [ ] **Step 3: Create a minimal React app**

`src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <section className="tool-panel">
        <p className="eyebrow">手机端本地处理</p>
        <h1>透明动图工具</h1>
        <p className="intro">上传 10 秒以内视频，框选主体，导出透明 GIF。</p>
        <button className="primary-button" type="button">上传视频</button>
      </section>
    </main>
  );
}
```

`src/styles.css`:

```css
:root {
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #172026;
  background: #f6f7f4;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.app-shell {
  min-height: 100vh;
  padding: 20px;
  display: grid;
  align-items: center;
}

.tool-panel {
  width: min(100%, 520px);
  margin: 0 auto;
}

.eyebrow {
  margin: 0 0 8px;
  color: #4b6b5b;
  font-size: 14px;
}

h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: 0;
}

.intro {
  margin: 12px 0 24px;
  color: #4d5860;
}

.primary-button {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 8px;
  background: #12664f;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: packages install and `package-lock.json` is created.

- [ ] **Step 5: Verify app builds**

Run: `npm run build`

Expected: TypeScript and Vite finish without errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json src/main.tsx src/App.tsx src/styles.css
git commit -m "feat: scaffold mobile web app"
```

## Task 2: Add Settings Validation

**Files:**
- Create: `src/domain/settings.ts`
- Create: `src/testSetup.ts`
- Create: `src/__tests__/settings.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { EXPORT_PRESETS, validateExportSettings } from '../domain/settings';

describe('export settings', () => {
  it('accepts the default transparent GIF preset', () => {
    expect(validateExportSettings(EXPORT_PRESETS.default)).toEqual({
      ok: true,
      settings: EXPORT_PRESETS.default,
    });
  });

  it('rejects 720px because the MVP max is 480px', () => {
    expect(validateExportSettings({ format: 'gif', longestEdge: 720, fps: 8, quality: 'high' })).toEqual({
      ok: false,
      message: '清晰度最高支持 480px。',
    });
  });

  it('rejects unsupported frame rates', () => {
    expect(validateExportSettings({ format: 'gif', longestEdge: 320, fps: 24, quality: 'standard' })).toEqual({
      ok: false,
      message: '帧率请选择 6、8 或 12 fps。',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/settings.test.ts`

Expected: FAIL because `src/domain/settings.ts` does not exist.

- [ ] **Step 3: Implement settings domain**

```ts
export type ExportFormat = 'gif';
export type ExportQuality = 'standard' | 'high';

export type ExportSettings = {
  format: ExportFormat;
  longestEdge: 240 | 320 | 480;
  fps: 6 | 8 | 12;
  quality: ExportQuality;
};

export const EXPORT_PRESETS = {
  small: { format: 'gif', longestEdge: 240, fps: 8, quality: 'standard' },
  default: { format: 'gif', longestEdge: 320, fps: 8, quality: 'standard' },
  highQuality: { format: 'gif', longestEdge: 480, fps: 8, quality: 'high' },
  smoothMotion: { format: 'gif', longestEdge: 320, fps: 12, quality: 'standard' },
} as const satisfies Record<string, ExportSettings>;

export type ValidationResult =
  | { ok: true; settings: ExportSettings }
  | { ok: false; message: string };

export function validateExportSettings(input: {
  format: string;
  longestEdge: number;
  fps: number;
  quality: string;
}): ValidationResult {
  if (input.format !== 'gif') {
    return { ok: false, message: '当前版本只支持透明 GIF。' };
  }

  if (![240, 320, 480].includes(input.longestEdge)) {
    return { ok: false, message: '清晰度最高支持 480px。' };
  }

  if (![6, 8, 12].includes(input.fps)) {
    return { ok: false, message: '帧率请选择 6、8 或 12 fps。' };
  }

  if (!['standard', 'high'].includes(input.quality)) {
    return { ok: false, message: '质量模式请选择标准或高质量。' };
  }

  return { ok: true, settings: input as ExportSettings };
}
```

`src/testSetup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/__tests__/settings.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/settings.ts src/testSetup.ts src/__tests__/settings.test.ts
git commit -m "feat: add export setting validation"
```

## Task 3: Add Video Validation and Frame Sampling

**Files:**
- Create: `src/domain/video.ts`
- Create: `src/__tests__/video.test.ts`

- [ ] **Step 1: Write validation tests**

```ts
import { describe, expect, it } from 'vitest';
import { getFrameTimes, validateVideoMetadata } from '../domain/video';

describe('video validation', () => {
  it('accepts videos up to 10 seconds', () => {
    expect(validateVideoMetadata({ duration: 10, width: 1080, height: 1920 })).toEqual({ ok: true });
  });

  it('rejects videos longer than 10 seconds', () => {
    expect(validateVideoMetadata({ duration: 10.1, width: 1080, height: 1920 })).toEqual({
      ok: false,
      message: '视频最长支持 10 秒。',
    });
  });

  it('samples frame times by fps without exceeding duration', () => {
    expect(getFrameTimes(1, 6)).toEqual([0, 0.167, 0.333, 0.5, 0.667, 0.833]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/video.test.ts`

Expected: FAIL because `src/domain/video.ts` does not exist.

- [ ] **Step 3: Implement video utilities**

```ts
export type VideoMetadata = {
  duration: number;
  width: number;
  height: number;
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
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/__tests__/video.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/video.ts src/__tests__/video.test.ts
git commit -m "feat: add video validation utilities"
```

## Task 4: Add Selection Rectangle Math

**Files:**
- Create: `src/domain/selection.ts`
- Create: `src/__tests__/selection.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { clampSelection, getSelectionCenter } from '../domain/selection';

describe('selection geometry', () => {
  it('clamps a box inside canvas bounds', () => {
    expect(clampSelection({ x: -10, y: 20, width: 400, height: 300 }, 320, 240)).toEqual({
      x: 0,
      y: 20,
      width: 320,
      height: 220,
    });
  });

  it('returns normalized center point', () => {
    expect(getSelectionCenter({ x: 80, y: 60, width: 160, height: 120 }, 320, 240)).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/selection.test.ts`

Expected: FAIL because `src/domain/selection.ts` does not exist.

- [ ] **Step 3: Implement selection math**

```ts
export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function clampSelection(rect: SelectionRect, canvasWidth: number, canvasHeight: number): SelectionRect {
  const x = Math.max(0, Math.min(rect.x, canvasWidth));
  const y = Math.max(0, Math.min(rect.y, canvasHeight));
  const right = Math.max(x, Math.min(rect.x + rect.width, canvasWidth));
  const bottom = Math.max(y, Math.min(rect.y + rect.height, canvasHeight));

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

export function getSelectionCenter(rect: SelectionRect, canvasWidth: number, canvasHeight: number) {
  return {
    x: Number(((rect.x + rect.width / 2) / canvasWidth).toFixed(4)),
    y: Number(((rect.y + rect.height / 2) / canvasHeight).toFixed(4)),
  };
}

export function hasUsableSelection(rect: SelectionRect): boolean {
  return rect.width >= 20 && rect.height >= 20;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/__tests__/selection.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/selection.ts src/__tests__/selection.test.ts
git commit -m "feat: add subject selection geometry"
```

## Task 5: Add Mask Composition Utilities

**Files:**
- Create: `src/domain/mask.ts`
- Create: `src/__tests__/mask.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { applyMaskToImageData, thresholdAlpha } from '../domain/mask';

describe('mask utilities', () => {
  it('thresholds alpha for GIF transparency', () => {
    expect(thresholdAlpha(0.49, 0.5)).toBe(0);
    expect(thresholdAlpha(0.5, 0.5)).toBe(255);
  });

  it('applies transparent alpha to background pixels', () => {
    const source = new ImageData(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]), 2, 1);
    const result = applyMaskToImageData(source, new Float32Array([1, 0]), 0.5);
    expect(Array.from(result.data)).toEqual([255, 0, 0, 255, 0, 0, 255, 0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/mask.test.ts`

Expected: FAIL because `src/domain/mask.ts` does not exist.

- [ ] **Step 3: Implement mask utilities**

```ts
export function thresholdAlpha(value: number, threshold: number): 0 | 255 {
  return value >= threshold ? 255 : 0;
}

export function applyMaskToImageData(source: ImageData, mask: Float32Array, threshold = 0.5): ImageData {
  if (mask.length !== source.width * source.height) {
    throw new Error('Mask size must match image size.');
  }

  const output = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    output.data[pixel * 4 + 3] = thresholdAlpha(mask[pixel], threshold);
  }

  return output;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/__tests__/mask.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/mask.ts src/__tests__/mask.test.ts
git commit -m "feat: add transparent mask composition"
```

## Task 6: Add IndexedDB History

**Files:**
- Create: `src/domain/history.ts`
- Create: `src/__tests__/history.test.ts`
- Modify: `src/testSetup.ts`

- [ ] **Step 1: Add fake IndexedDB setup**

Append to `src/testSetup.ts`:

```ts
import 'fake-indexeddb/auto';
```

- [ ] **Step 2: Write failing history tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearHistory, listHistory, saveHistoryItem } from '../domain/history';

describe('history storage', () => {
  beforeEach(async () => {
    await clearHistory();
  });

  it('keeps only the newest three exports', async () => {
    for (let index = 1; index <= 4; index += 1) {
      await saveHistoryItem({
        id: `item-${index}`,
        createdAt: index,
        format: 'gif',
        fps: 8,
        longestEdge: 320,
        blob: new Blob([String(index)], { type: 'image/gif' }),
      });
    }

    const items = await listHistory();
    expect(items.map((item) => item.id)).toEqual(['item-4', 'item-3', 'item-2']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/__tests__/history.test.ts`

Expected: FAIL because `src/domain/history.ts` does not exist.

- [ ] **Step 4: Implement IndexedDB history**

```ts
import type { ExportSettings } from './settings';

export type HistoryItem = ExportSettings & {
  id: string;
  createdAt: number;
  blob: Blob;
};

const DB_NAME = 'transparent-video-gif-history';
const STORE_NAME = 'exports';
const VERSION = 1;

function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openHistoryDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
  });
}

export async function listHistory(): Promise<HistoryItem[]> {
  const items = await withStore<HistoryItem[]>('readonly', (store) => store.getAll());
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  await withStore<IDBValidKey>('readwrite', (store) => store.put(item));
  const items = await listHistory();
  const staleItems = items.slice(3);

  for (const stale of staleItems) {
    await withStore<undefined>('readwrite', (store) => store.delete(stale.id));
  }
}

export async function clearHistory(): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.clear());
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/__tests__/history.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/history.ts src/__tests__/history.test.ts src/testSetup.ts
git commit -m "feat: add local export history"
```

## Task 7: Add Transparent GIF Encoding

**Files:**
- Create: `src/domain/gif.ts`

- [ ] **Step 1: Create GIF encoder adapter**

```ts
import { GIFEncoder, applyPalette, quantize } from 'gifenc';

export type GifFrame = {
  imageData: ImageData;
  delayMs: number;
};

export function encodeTransparentGif(frames: GifFrame[]): Blob {
  if (frames.length === 0) {
    throw new Error('At least one frame is required.');
  }

  const gif = GIFEncoder();

  for (const frame of frames) {
    const rgba = frame.imageData.data;
    const transparentIndex = 0;
    const palette = quantize(rgba, 255);
    palette.unshift([0, 0, 0]);

    const indexed = applyPalette(rgba, palette);

    for (let pixel = 0; pixel < rgba.length / 4; pixel += 1) {
      if (rgba[pixel * 4 + 3] === 0) {
        indexed[pixel] = transparentIndex;
      }
    }

    gif.writeFrame(indexed, frame.imageData.width, frame.imageData.height, {
      palette,
      delay: frame.delayMs,
      transparent: true,
      transparentIndex,
      dispose: 2,
      repeat: 0,
    });
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: PASS. If TypeScript reports missing `gifenc` types, add `src/types/gifenc.d.ts` with the exact exported function declarations used here, then rerun.

- [ ] **Step 3: Commit**

```bash
git add src/domain/gif.ts src/types/gifenc.d.ts
git commit -m "feat: add transparent gif encoder"
```

## Task 8: Add MediaPipe Segmenter Adapter

**Files:**
- Create: `src/mediapipe/interactiveSegmenter.ts`

- [ ] **Step 1: Implement the adapter**

```ts
import {
  FilesetResolver,
  InteractiveSegmenter,
  type InteractiveSegmenterResult,
} from '@mediapipe/tasks-vision';
import { getSelectionCenter, type SelectionRect } from '../domain/selection';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite';

export type SegmenterAdapter = {
  segmentFrame(image: HTMLCanvasElement | HTMLImageElement | ImageBitmap, selection: SelectionRect): Promise<Float32Array>;
  close(): void;
};

export async function createInteractiveSegmenter(): Promise<SegmenterAdapter> {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  );

  const segmenter = await InteractiveSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });

  return {
    async segmentFrame(image, selection) {
      const width = 'width' in image ? image.width : 0;
      const height = 'height' in image ? image.height : 0;
      const point = getSelectionCenter(selection, width, height);

      const result = await new Promise<InteractiveSegmenterResult>((resolve, reject) => {
        segmenter.segment(
          image,
          { keypoint: { x: point.x, y: point.y } },
          (segmenterResult) => resolve(segmenterResult),
        );
        window.setTimeout(() => reject(new Error('Segmentation timed out.')), 30000);
      });

      const mask = result.categoryMask;
      if (!mask) {
        throw new Error('Segmentation did not return a mask.');
      }

      const values = mask.getAsFloat32Array();
      mask.close();
      return values;
    },
    close() {
      segmenter.close();
    },
  };
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: PASS. If the MediaPipe API types differ from this adapter, update only this file so the rest of the app still consumes `SegmenterAdapter`.

- [ ] **Step 3: Commit**

```bash
git add src/mediapipe/interactiveSegmenter.ts
git commit -m "feat: add browser segmentation adapter"
```

## Task 9: Build Upload, Selection, and Settings UI

**Files:**
- Create: `src/components/UploadStep.tsx`
- Create: `src/components/SelectionStep.tsx`
- Create: `src/components/SettingsStep.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add upload component**

Create `UploadStep.tsx` with a file input accepting `video/*`, a visible upload button label, and an error slot. On file change, pass the `File` to `onVideoSelected(file)`.

- [ ] **Step 2: Add selection component**

Create `SelectionStep.tsx` with a canvas preview and touch/mouse drag handling. Store a `SelectionRect`, draw a visible rectangle overlay, clamp the rectangle with `clampSelection`, and call `onConfirm(rect)`.

- [ ] **Step 3: Add settings component**

Create `SettingsStep.tsx` with segmented buttons for 240/320/480, 6/8/12 fps, and standard/high quality. Use `validateExportSettings` before calling `onStart(settings)`.

- [ ] **Step 4: Wire app workflow**

Update `App.tsx` to manage these states:

```ts
type WorkflowStep = 'upload' | 'select' | 'settings' | 'processing' | 'result';
```

The app should keep `videoFile`, `firstFrame`, `selection`, and `settings` in React state.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/UploadStep.tsx src/components/SelectionStep.tsx src/components/SettingsStep.tsx src/App.tsx src/styles.css
git commit -m "feat: add upload selection and settings flow"
```

## Task 10: Implement Processing Pipeline and Result UI

**Files:**
- Create: `src/components/ProcessingStep.tsx`
- Create: `src/components/ResultStep.tsx`
- Modify: `src/App.tsx`
- Modify: `src/domain/video.ts`

- [ ] **Step 1: Add browser frame extraction**

Extend `src/domain/video.ts` with `loadVideoMetadata(file)`, `captureFirstFrame(file)`, and `extractVideoFrames(file, settings)`. Use an object URL, an HTML video element, a canvas, and `getFrameTimes`.

- [ ] **Step 2: Add processing orchestration**

In `App.tsx`, implement `processVideo()`:

1. Extract frames at the selected fps and size.
2. Create the MediaPipe segmenter.
3. Segment each frame.
4. Apply masks with `applyMaskToImageData`.
5. Encode frames with `encodeTransparentGif`.
6. Save the blob through `saveHistoryItem`.
7. Show result preview URL.

- [ ] **Step 3: Add progress UI**

`ProcessingStep.tsx` should show current phase text, progress percentage, and a cancel button. Cancel should stop processing after the current frame and return to settings.

- [ ] **Step 4: Add result UI**

`ResultStep.tsx` should show a checkerboard preview area, the generated GIF, a save link with `download="transparent-gif.gif"`, a retry button, and the latest history items.

- [ ] **Step 5: Run build and tests**

Run: `npm test && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/ProcessingStep.tsx src/components/ResultStep.tsx src/domain/video.ts
git commit -m "feat: add client-side transparent gif processing"
```

## Task 11: Mobile QA and Browser Verification

**Files:**
- Modify: files discovered during QA only.

- [ ] **Step 1: Start local dev server**

Run: `npm run dev`

Expected: Vite prints a local URL and a network URL.

- [ ] **Step 2: Open the app in the browser**

Use the in-app browser for `http://localhost:5173`.

Expected: upload-first mobile tool screen renders without layout overlap.

- [ ] **Step 3: Verify desktop and mobile layouts**

Check 390x844 and 1280x800 viewport screenshots.

Expected: buttons fit, selection canvas stays inside the viewport, no text overlaps.

- [ ] **Step 4: Verify core workflow manually**

Use a short sample video under 10 seconds:

1. Upload video.
2. Confirm first frame appears.
3. Draw a box around the subject.
4. Choose default settings.
5. Export transparent GIF.
6. Confirm preview appears on checkerboard.
7. Save result.
8. Retry with a different box.
9. Confirm history contains no more than 3 items.

- [ ] **Step 5: Commit QA fixes**

```bash
git add src
git commit -m "fix: polish mobile workflow"
```

## Self-Review

- Spec coverage: This plan covers mobile-only browser processing, upload, first-frame box selection, 10-second limit, transparent GIF export, 240/320/480 resolution choices, 6/8/12 fps choices, retry, save, and latest-3 history.
- Known implementation risk: MediaPipe browser API type names may differ slightly from the adapter sketch. Task 8 isolates that risk to `src/mediapipe/interactiveSegmenter.ts`.
- GIF limitation covered: Task 5 thresholds alpha and Task 7 uses transparent GIF frame encoding, matching GIF's binary transparency behavior.
- No server work is included.
