# Feature Specification: Autoplaying, Looping GIF and Video Media

**Feature Branch**: `012-animated-gif-video`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "handle gif and video files playing automatically and looping"

## Clarifications

### Session 2026-11-13

- Q: How should a video's still poster frame be produced? → A: No stored poster; the browser shows the video's first frame and the video itself serves as the thumbnail (no new server-side video tooling).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Animated GIFs play and loop everywhere (Priority: P1)

An admin uploads an animated GIF as a character image. Everywhere the image appears (gallery cards, character page, image page, full-size view, avatar), the animation plays automatically and loops continuously with no action from the visitor.

**Why this priority**: GIF uploads are already accepted. They must visibly behave as animations, in every view, to be considered supported.

**Independent Test**: Upload an animated GIF, view it in each context, and confirm it is animated and loops, with no user action.

**Acceptance Scenarios**:

1. **Given** an animated GIF image, **When** a visitor opens the gallery or a character page, **Then** its thumbnail animates and loops automatically.
2. **Given** an animated GIF image, **When** a visitor opens its full-size view, **Then** the original animation plays and loops automatically.
3. **Given** a static GIF or a non-GIF image, **When** it is shown, **Then** it behaves exactly as before.

---

### User Story 2 - Upload and view video files (Priority: P1)

An admin uploads a short video (MP4 or WebM) as a character image. Visitors see it play automatically, silently and looping, in place of a still picture, wherever images appear.

**Why this priority**: This is the new capability requested.

**Independent Test**: Upload an MP4 and a WebM, then confirm they are accepted, play automatically muted, and loop in the gallery, on the character page and in full view.

**Acceptance Scenarios**:

1. **Given** the admin image form, **When** an MP4 or WebM file is uploaded with the usual required details (alt text, artist), **Then** it is accepted and saved like any other image.
2. **Given** a video image, **When** a visitor views it anywhere images appear, **Then** it plays automatically, muted and looping, and fits the same frame as still images.
3. **Given** a file that is not a readable video or image, **When** uploaded, **Then** it is rejected with a clear message and nothing is saved.
4. **Given** a video image, **When** the visitor views it full size, **Then** playback controls are available so they can pause it.

---

### User Story 3 - Rating rules, accessibility and comfort (Priority: P2)

Video and animated media follow all existing rules: NSFW media stays hidden unless the visitor opted in, alt text is kept, and visitors who prefer reduced motion are not forced into endless motion.

**Why this priority**: Protects safety and accessibility guarantees already promised to visitors.

**Independent Test**: Request an NSFW video without opting in and confirm it is hidden as if it does not exist; enable a reduced-motion preference and confirm media does not autoplay but can be started manually.

**Acceptance Scenarios**:

1. **Given** an NSFW video and a visitor who has not opted in, **When** they request it by any address, **Then** it is not found, identical to hidden NSFW images.
2. **Given** a visitor with a reduced-motion preference, **When** media is shown, **Then** it does not autoplay and can be started with a visible control.
3. **Given** a video image, **When** a screen reader reads the page, **Then** the alt text is announced.

---

### Edge Cases

- Very large videos: rejected above the existing upload size limit with a clear message.
- A video with an audio track: always played muted by default; audio can be heard only through the full-size controls.
- A browser that cannot play the video format: the alt text and a link to download the video are shown instead.
- Visitors without scripting: autoplay and looping still work.
- Using a video as a character avatar: avatars must remain still images, so the admin is told that videos cannot be avatars.
- Deleting a video image removes all its files, like other images.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Animated GIFs MUST play automatically and loop continuously in every place an image is shown, including the gallery, character page, image page and full-size view.
- **FR-002**: The system MUST accept MP4 and WebM video uploads as images, validated by file content rather than the declared type, within the existing upload size limit.
- **FR-003**: Videos MUST play automatically, muted and looping wherever images are shown, without visitor interaction.
- **FR-004**: Video MUST appear in the same frame size and layout as still images, with no horizontal scroll on any screen size.
- **FR-005**: Videos MUST NOT require a separately generated poster file; the video's own first frame is shown while loading, when autoplay is suppressed, or when playback is paused.
- **FR-006**: The full-size video view MUST provide playback controls (pause/play, volume).
- **FR-007**: Videos MUST follow the same SFW/NSFW rules as images; hidden videos MUST respond as not found.
- **FR-008**: Videos MUST keep the required alt text, artist name and artist link, and appear in artist grouping and character image lists like any image.
- **FR-009**: Visitors who prefer reduced motion MUST NOT have media autoplay; a visible control MUST let them start it.
- **FR-010**: Videos MUST be refused as character avatars with a clear message; avatars stay still images.
- **FR-011**: Invalid or unreadable video uploads MUST be rejected with a clear message and leave no files behind.
- **FR-012**: Video MUST be seekable and stream without downloading the whole file first.
- **FR-013**: Deleting a video image MUST remove all stored files for it.

### Key Entities

- **Image (media item)**: Existing entity, extended with a kind: still image, animated image or video. Keeps alt text, short description, rating, artist and character links; a video has no separate poster file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of animated GIFs and videos start and loop without any visitor action in the gallery, character page and full-size view.
- **SC-002**: An admin can upload a video and see it in the gallery in the same number of steps as uploading a still image.
- **SC-003**: Zero NSFW videos are retrievable by visitors who have not opted in.
- **SC-004**: With a reduced-motion preference, 0 media items start playing on their own.
- **SC-005**: A visitor can start watching a 20 MB video within 2 seconds on a typical home connection.

## Assumptions

- Supported video formats are MP4 and WebM; other formats are rejected.
- Videos have no separate size limit beyond the existing upload ceiling, which may need to be raised for video.
- Video is played muted by default; audio is opt-in through the full-size controls.
- Animated GIF previews in the gallery already keep animation; the full original is served for the full-size view.
- Animated GIFs are images, so browsers offer no way to pause them without re-encoding; they keep looping under a reduced-motion preference. Reduced-motion handling (FR-009, SC-004) applies to videos.
- The system has no video processing tooling; videos are stored and served as uploaded, and their dimensions may be read by the browser.
- Only admins upload media; there are no visitor uploads.
