# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests (jsdom environment, excludes *.node.test.js)
npm test

# Run tests in watch mode
npm run test:watch

# Run a single test file
npx vitest js/tests/NTPService.test.js --run

# Run NTP-specific tests
npm run test:ntp

# Open test UI
npm run test:ui
```

No build step — this is a static HTML/JS app. Open `index.html` directly in a browser or serve it with any static file server (e.g., `npx serve .`).

## Architecture

The app is a client-side time display webapp using vanilla JS ES modules (no framework, no bundler). Entry point is `js/main.js`, which instantiates an `App` class that wires together all modules.

**Module map:**

| Module | Path | Role |
|--------|------|------|
| `App` | `js/main.js` | Top-level orchestrator; initializes all components, handles network monitoring and reconnection |
| `TimeController` | `js/controllers/TimeController.js` | Drives the 1-second update loop; coordinates NTP sync vs local fallback |
| `NTPService` | `js/services/NTPService.js` | Fetches NTP time via HTTP (Google), calculates local offset |
| `UIController` | `js/controllers/UIController.js` | Updates DOM for time/date display, settings panel, status messages |
| `SettingsManager` | `js/managers/SettingsManager.js` | Reads/writes user preferences to `localStorage` |
| `BackgroundManager` | `js/managers/BackgroundManager.js` | Handles background image upload (File API), opacity, localStorage persistence |
| `WorldClockManager` | `js/managers/WorldClockManager.js` | Manages multiple timezone clocks; non-critical (failures don't block app) |
| `WorldClockUI` | `js/controllers/WorldClockUI.js` | Renders world clock cards in the DOM |
| `TimezoneSelector` | `js/controllers/TimezoneSelector.js` | UI for adding/removing world clocks |

**Key wiring in `App`:** `TimeController.updateTimeDisplay` is monkey-patched after init to also call `WorldClockUI.updateAllWorldClocks()` on every tick.

**Custom events used for cross-component communication:** `worldClockUpdate`, `settingsChanged`, `ntpSyncSuccess`, `ntpSyncFailure`, `backgroundUploadError`, `backgroundError`, `worldClockError`, `settingsError`.

**Testing notes:**
- Tests live in `js/tests/` and run under jsdom (simulated browser environment)
- Files matching `*.node.test.js` are excluded from the default test run (they require a real Node environment)
- `test-setup.js` runs before all tests for global setup

**Legacy subdirectory:** `Customizable-Analog-Alarm-Clock-with-jQuery-Canvas-thooClock/` is a separate, unrelated jQuery/Canvas analog clock project included in the repo but not part of the main app.
