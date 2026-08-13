# Date & Time Utilities — Browser Extension

Chrome and Firefox (Manifest V3) packaging for the [Date & Time Utilities](../README.md#datetimeutilities--date--time) workspace. Clicking the toolbar icon opens the date/time desk — Unix timestamps, timezone conversion, duration units, and date arithmetic — in a browser tab, entirely local to your machine.

## Prerequisites

- [Bun](https://bun.sh) (the repo's package manager), or a Node.js setup that can run the Vite build
- A Chromium browser (Chrome, Edge, Brave, Opera) and/or Firefox

## Build

From the **repo root**, run:

```bash
bun run build:datetime-extension
```

This does two things:

1. Generates the icon set into `extensions/datetime-utilities/icons/` (`icon-16.png`, `icon-48.png`, `icon-128.png`).
2. Builds the date/time workspace into `extensions/datetime-utilities/app/` with relative asset paths (`./assets/...`) so it loads from a `chrome-extension://` or `moz-extension://` origin.

> `extensions/datetime-utilities/app/` and `extensions/datetime-utilities/icons/` are generated output and are gitignored — they must be regenerated before loading the extension.

## Load in Chrome / Edge / Brave

1. Run `bun run build:datetime-extension`.
2. Open `chrome://extensions`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the `extensions/datetime-utilities/` folder (the one containing `manifest.json`).
5. Click the puzzle-piece icon in the toolbar and pin **Date & Time Utilities**.
6. Click the toolbar icon — the date/time desk opens in a new tab.

To pick up changes, re-run `bun run build:datetime-extension`, then click the circular **Reload** arrow on the extension card.

## Load in Firefox

1. Run `bun run build:datetime-extension`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `extensions/datetime-utilities/manifest.json`.
4. Click the toolbar icon — the date/time desk opens in a new tab.

Temporary add-ons are removed when Firefox restarts. Re-run the build and reload the add-on to pick up changes.

## Publish

### Chrome Web Store

1. Run `bun run build:datetime-extension`.
2. Zip the **contents** of `extensions/datetime-utilities/` (so `manifest.json` is at the zip root).
3. Upload at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (one-time $5 registration fee).

### Firefox Add-ons (AMO)

1. Set your own `browser_specific_settings.gecko.id` in `extensions/datetime-utilities/manifest.json` (replace `datetime-utilities@yourdomain.com`).
2. Run `bun run build:datetime-extension`.
3. Zip the **contents** of `extensions/datetime-utilities/`.
4. Submit at [addons.mozilla.org](https://addons.mozilla.org/developers/) (free).

## Folder layout

```text
extensions/datetime-utilities/
├── manifest.json        # MV3 manifest (Chrome + Firefox)
├── background.js        # Toolbar click → open the date/time desk in a tab
├── README.md            # This file
├── icons/               # Generated (gitignored)
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── app/                 # Built workspace (gitignored)
    ├── datetime-extension.html
    └── assets/
```

## Notes

- No permissions are requested and no data leaves the browser; the app uses the browser's `Intl` engine and your system clock directly.
- The only optional remote resource is the Google Fonts import, which falls back to system fonts when unavailable.
- Relative asset paths are handled by `vite.datetime-extension.config.ts` (`base: './'`), so don't point the extension at a server — it's fully static.
