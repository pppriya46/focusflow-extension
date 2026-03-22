# FocusFlow

FocusFlow is a Chrome extension that helps you stay on task by blocking distracting sites during timed focus sessions and tracking your progress.

## Features

- Timed sessions with preset durations: `25`, `45`, `60`, and `90` minutes
- Custom blocklist
- Automatic blocking during active sessions
- Session history and simple analytics dashboard

## Project Structure

```text
focus-extension/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── blocked.html
├── dashboard.html
└── icons/
```

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this project folder

## Usage

1. Click the FocusFlow extension icon
2. Pick a session length
3. Add sites to block
4. Click `START SESSION`
5. Click `stats →` to open the dashboard

## Notes

- Built with Manifest V3 and plain HTML, CSS, and JavaScript
- Uses local browser storage for blocked sites and session data
- No build step required
