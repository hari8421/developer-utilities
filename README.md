# JSON Forge

JSON Forge is a browser-based JSON workbench for the everyday development tasks that happen around APIs, configuration files, webhooks, feature flags, and test fixtures.

It gives you a calm, focused place to validate, reshape, compare, and export JSON without sending payloads to a server.

## What the app can do

### Workbench operations

The Workbench accepts any valid JSON value: objects, arrays, strings, numbers, booleans, or `null`.

- **Format** — Parses the input and pretty-prints it with two-space indentation.
- **Minify** — Parses the input and removes unnecessary whitespace for compact transport or embedding.
- **Sort keys** — Recursively sorts object keys alphabetically, including objects nested inside arrays and other objects.
- **Validate** — Checks syntax by parsing the document and reports whether it is valid. Valid output includes the detected top-level type and key count.
- **Escape** — Converts the entire input document into a JSON-encoded string, escaping quotes, newlines, tabs, and other characters so it can be embedded safely in source code or another JSON value.
- **Unescape** — Parses a quoted JSON string and resolves its escape sequences back into readable text. The input must itself be a JSON string.

### Compare mode

Compare mode accepts two JSON documents and recursively compares their structure and values.

The comparison reports:

- **Changed** values, such as a version or nested setting changing from one value to another
- **Added** keys or array entries
- **Removed** keys or array entries
- **Matching** values
- The JSON path where each difference occurs, such as `$.limits.timeoutMs` or `$.regions[1].name`

The comparison is structural rather than text-only, so formatting differences alone do not appear as changes.

### Convenience features

- Starter samples for API responses, feature flags, and package configuration
- Copy transformed output to the clipboard
- Download transformed output as `json-forge-output.json`
- Input/output line and byte counts
- Live valid/invalid syntax status on the input editor
- Reset to the starter sample
- Responsive layout for desktop and smaller screens

## Privacy

JSON Forge runs entirely in the browser. It has no backend, authentication, API calls, database, or analytics integration. Input JSON is not uploaded anywhere by the app.

The only external resource referenced by the page is Google Fonts. If font loading is unavailable, the app falls back to local system fonts and all JSON functionality continues to work.

## Tech stack

- React 19
- TypeScript
- Vite
- Plain CSS with responsive media queries
- Bun for package installation and scripts

## Getting started

### Requirements

- Bun 1.x, or a recent Node.js installation capable of running the project scripts
- A modern browser with JavaScript enabled

### Install dependencies

```bash
bun install
```

### Start the development preview

For a normal local session, run:

```bash
bun run dev
```

For the Freebuff isolated preview, use the configured command:

```bash
bun run dev -- --host 0.0.0.0 --port $PORT
```

Freebuff supplies the isolated preview port automatically. The preview command is intentionally configured with `0.0.0.0` so the workspace UI can reach the Vite server.

### Typecheck

```bash
bun run typecheck
```

Equivalent direct check:

```bash
bun tsc -b --noEmit
```

### Build for production

```bash
bun run build
```

The production build is emitted to `dist/` as static Vite output.

## Environment variables

No environment variables are required.

There are no secrets, API keys, database connections, or service credentials used by the current app. The `.env` and `.env.*` patterns are ignored so local secrets can be added later without being committed.

## Project structure

```text
.
├── index.html           # Vite HTML entrypoint and page metadata
├── package.json         # Scripts and dependencies
├── vite.config.ts       # React-enabled Vite configuration
├── src/
│   ├── App.tsx          # JSON Forge UI, operations, and comparison logic
│   ├── index.css        # Theme, layout, responsive styling, and components
│   ├── main.tsx         # React entrypoint
│   └── vite-env.d.ts    # Vite client type declarations
├── tsconfig*.json       # TypeScript project configuration
└── .gitignore           # Local dependency, build, and environment ignores
```

## Preview configuration

The Freebuff preview settings are configured as follows:

| Setting | Command / value |
| --- | --- |
| Install | `bun install` |
| Preview | `bun run dev -- --host 0.0.0.0 --port $PORT` |
| Preview port metadata | `5173` |
| Build | `bun run build` |

The preview command binds to `0.0.0.0` and uses Freebuff's injected `PORT` value in isolated workspaces.

## Scope and future extensions

The current implementation intentionally focuses on safe, dependency-light JSON workflows. Possible future additions include JSONPath querying, schema validation, JSON Patch generation, YAML conversion, CSV conversion, saved workspaces, and keyboard shortcuts.
