# Hunt the Wumpus (Angular)

Angular single-page implementation of the classic Hunt the Wumpus game
(selection test). **Status: complete** — configurable board, full game screen,
English/Spanish UI, and unit tests.

## Requirements

- Node 24.21.0 and npm 12.2.0 (pinned for reproducibility)
- Chrome or Chromium: unit tests run in a real headless browser (Karma)

## Install

```bash
npm install
```

## Development server

```bash
npm start
```

Then open `http://localhost:4200/`. The app reloads on source changes.

## Build

```bash
npm run build
```

Production bundles are written to `dist/`.

## Unit tests

Karma + Jasmine, as mandated by the specification.

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

If Karma cannot find Chrome, export `CHROME_BIN` (for example
`export CHROME_BIN=/usr/bin/google-chrome`).
