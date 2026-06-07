# Transparent Video GIF Tool Design

## Goal

Build a mobile-first web tool that lets a user turn a short video into a transparent-background animated asset. The first version is for personal use and must run fully on the phone: upload, subject selection, matting, preview, export, and history all happen in the browser without a desktop backend.

The main use case is making reaction GIFs, stickers, and reusable transparent video material for secondary editing.

## Non-Goals

- No server-side processing in the MVP.
- No WeChat mini program in the MVP.
- No cloud storage or account system.
- No 720p export in the first version.
- No manual frame-by-frame editing in the first version.

## User Flow

1. The user opens the web page on a phone.
2. The user uploads a video.
3. The app validates the video length and basic size limits.
4. The app shows the first frame.
5. The user draws a rectangular box around the subject to keep.
6. The user chooses export settings:
   - Format: transparent GIF by default.
   - Resolution: 240px, 320px, or 480px on the longest edge.
   - Frame rate: 6, 8, or 12 fps.
   - Quality mode: standard or high quality.
7. The user starts processing.
8. The app extracts frames, segments the selected subject, applies transparent background, and encodes the result.
9. The user previews the transparent animation.
10. The user can save the result, retry with another box, or change export settings.
11. The app keeps the latest 3 completed exports in local history.

## MVP Constraints

- Maximum input duration: 10 seconds.
- Recommended default: 320px, 8 fps, transparent GIF.
- Maximum first-version export size: 480px longest edge.
- History count: 3 exports.
- Processing is local to the browser. The app should not upload video files anywhere.
- If the phone is too slow or memory usage is high, the app should suggest reducing resolution or frame rate.

## Product Shape

The app should be a single-page mobile web app with a step-by-step workflow:

- Upload view: video picker, duration limit, simple empty state.
- Selection view: first-frame canvas with a draggable/resizable rectangle.
- Settings view: compact controls for format, size, fps, and quality.
- Processing view: progress status, current step, cancel action.
- Result view: preview, save/download, retry, and history.

The UI should feel like a practical creation tool, not a landing page. The first screen should be the uploader.

## Technical Approach

Use a browser-only pipeline:

1. Decode the uploaded video with HTML video and canvas.
2. Sample frames based on selected fps.
3. Resize frames to the chosen export resolution before segmentation.
4. Use MediaPipe Interactive Image Segmenter in the browser. The drawn box supplies the subject area; the app uses the box center as the primary prompt and clips the returned mask to the selected area when needed.
5. Generate alpha masks for each frame.
6. Smooth masks enough to reduce flicker and rough edges.
7. Compose each frame onto transparent pixels.
8. Encode the transparent animation as GIF.
9. Store finished outputs and metadata in IndexedDB.

The first implementation should use `@mediapipe/tasks-vision` because it has a browser JavaScript task for interactive image segmentation and returns mask data that can be composed onto transparent frames. It should run segmentation work in a Web Worker where the browser/runtime allows it, because the MediaPipe web documentation notes that segmentation calls can block the main UI thread.

## Export Strategy

Transparent GIF is the primary export because it matches the user's priority. The MVP should use `gifenc` for GIF encoding because it supports browser usage, animation, and per-frame transparency controls.

GIF has only 1-bit transparency per pixel, so soft mask edges must be thresholded before encoding. The app should show this as a known GIF limitation and keep the internal frame pipeline RGBA so a later transparent WebM or PNG sequence export can preserve softer alpha.

Initial export presets:

- Small: 240px, 8 fps.
- Default: 320px, 8 fps.
- High quality: 480px, 8 fps.
- Motion smooth: 320px, 12 fps.

The app should warn that higher resolution and higher frame rate increase processing time and file size.

## History

History should store only completed exports:

- Preview thumbnail or first frame.
- Output blob reference.
- Export format.
- Resolution.
- Frame rate.
- Created time.

Keep the newest 3 records. When a fourth result is created, delete the oldest.

## Error Handling

The app should handle:

- Video longer than 10 seconds.
- Unsupported video format.
- Browser cannot decode the file.
- Model cannot load.
- Phone runs out of memory.
- GIF encoding fails.
- User cancels processing.

Errors should be short and actionable, for example: "This phone may not have enough memory. Try 240px or 6 fps."

## Testing Plan

Manual verification is important for this MVP because the main risk is real mobile behavior.

Test cases:

- Upload a valid short video.
- Reject a video longer than 10 seconds.
- Draw and adjust a subject box on the first frame.
- Export default transparent GIF.
- Export 240px and 480px presets.
- Retry with a different subject box.
- Confirm the latest 3 results remain in history.
- Confirm the result has transparent pixels, not a white or black background.
- Test on a mobile browser at phone viewport size.

Automated tests can cover:

- Duration validation.
- Export setting validation.
- History limit behavior.
- Processing state transitions.

## Risks

- Mobile browsers may be slow for model inference and GIF encoding.
- Transparent GIF encoding can create large files.
- Browser support for video decoding varies by device and file type.
- Box-guided segmentation may not track fast motion perfectly across frames.
- Mask flicker may appear between frames.

The first version should prioritize a working self-use tool over perfect quality. If GIF performance is too poor, the app can still keep GIF as the main target while offering transparent WebM or PNG sequence as a fallback.

## Implementation Decisions

- Segmentation runtime: `@mediapipe/tasks-vision`.
- Segmentation task: MediaPipe Interactive Image Segmenter.
- Subject prompt: rectangular user box, converted to a center keypoint prompt and optional mask clipping.
- Frame strategy: segment every sampled export frame independently in the first version.
- GIF encoder: `gifenc`.
- Storage: IndexedDB for exported blobs and metadata.
- Fallback export: none in the MVP; transparent GIF remains the only required output.

## References

- MediaPipe Interactive Image Segmenter for web: https://developers.google.com/edge/mediapipe/solutions/vision/interactive_segmenter/web_js
- gifenc browser GIF encoder: https://github.com/mattdesl/gifenc
