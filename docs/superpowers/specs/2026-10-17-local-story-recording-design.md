# Local Story Recording Demo Design

## Goal

Turn the current recording interaction into a working, presentation-ready prototype. A user can record a family food story, stop the recording, replay it, refresh the page, and still find the saved audio and transcript on the same device.

This version is deliberately local-first. It does not add accounts, private links, a remote database, or cross-device sharing.

## User experience

1. The user presses **Record** and grants microphone access.
2. The interface shows that recording is active while live speech recognition fills the transcript when the browser supports it.
3. The user presses **Stop**.
4. The app assembles the actual `MediaRecorder` chunks into an audio `Blob` and saves it with the transcript, creation date, duration, and recipe title.
5. The saved story appears beneath the controls with an HTML audio player and transcript.
6. Reloading the page restores the most recent saved story from browser storage.
7. The user can delete the saved story before making another recording.

If speech recognition is unavailable but audio recording is supported, audio recording still works and the saved story explains that no automatic transcript was produced.

## Architecture

### Recording hook

`useVoiceRecorder` remains responsible for microphone permission, recording state, and speech recognition. It will also:

- subscribe to `MediaRecorder.ondataavailable`;
- request the recorder's final data on stop;
- build a typed saved-story object only after `onstop` confirms the recording is complete;
- expose saving state and the resulting audio `Blob` to the UI;
- avoid marking a recording complete when no audio data was captured.

Stopping tracks happens after the recorder is asked to stop. Object URLs are created by the playback layer and revoked when replaced or unmounted.

### Local persistence

A small storage module will wrap IndexedDB behind functions such as `saveStory`, `loadLatestStory`, and `deleteStory`. IndexedDB is used because `localStorage` cannot safely hold non-trivial audio blobs.

The stored record contains:

- stable ID;
- recipe title;
- audio blob and MIME type;
- final transcript;
- creation timestamp;
- recording duration in milliseconds.

The demo keeps one latest story to keep the interface focused. The record shape allows a future archive to retain multiple stories without changing the recording format.

### Playback UI

A `SavedStory` component will render the latest record as a simple continuation of the existing white article experience. It includes the date, duration, transcript, native audio controls, and a delete action. It will not imitate a book or introduce a new color theme.

The current static Soto Ayam recipe can remain as the post-recording content, but it is no longer proof that recording succeeded. The playable saved story is the confirmation.

## Failure handling

- Microphone denial continues to show the existing error.
- Unsupported speech recognition does not block audio recording.
- A recorder error or empty audio result does not create a saved story.
- An IndexedDB failure keeps the freshly recorded story available in memory and displays that it was not preserved after refresh.
- A pending save disables starting another recording until the save resolves.

## Verification

Unit tests will cover audio chunk collection, recorder completion, transcript capture, unsupported transcription, persistence restoration, deletion, empty recordings, and storage failures.

Browser tests will verify the saved-story interface and reload restoration using deterministic browser fixtures. A manual smoke test in Chrome will confirm microphone permission, audible playback, refresh persistence, and deletion on the actual device.

## Out of scope

- Cloud backup or sharing
- User accounts and permissions
- Sending email or Facebook invitations
- Server-side transcription
- Editing transcripts
- Multiple-story archive navigation
