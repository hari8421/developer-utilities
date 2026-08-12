# Developer Utilities

Developer Utilities is a browser-first toolkit for common data tasks during development. It currently contains two focused workspaces:

- **JsonUtilities** — the JSON Utilities workbench for formatting, validation, transformation, and comparison.
- **Decrypt-utilities** — a local encoding, encryption, decryption, and hashing desk.

## Utilities

### JsonUtilities / JSON Utilities

The JSON workbench accepts any valid JSON value: objects, arrays, strings, numbers, booleans, or `null`.

- **Format** — Pretty-print JSON with two-space indentation.
- **Minify** — Remove unnecessary whitespace for compact payloads.
- **Sort keys** — Recursively alphabetize object keys at every nesting level, including objects inside arrays.
- **Validate** — Parse the input and report validity, top-level type, and key count.
- **Escape** — Convert the document into a JSON-encoded string that can be embedded safely in source code or another JSON value.
- **Unescape** — Parse a quoted JSON string and resolve its escape sequences back into readable text.
- **Compare** — Compare two documents recursively and report changed, added, removed, and matching values with JSON paths such as `$.limits.timeoutMs` and `$.regions[1].name`.
- **Copy output** — Copy transformed JSON to the clipboard.
- **Download output** — Save transformed output as `json-utilities-output.json`.
- **Samples and reset** — Start from API response, feature flag, or package configuration samples.
- **Live editor details** — See syntax state, line counts, and byte counts while editing.

The comparison is structural rather than text-only, so whitespace or indentation changes alone do not appear as differences.

### Decrypt-utilities

The encryption desk runs with browser-native Web Crypto APIs and does not send data to a server.

#### Base64 encode

Converts UTF-8 text into a Base64 string. This is useful for transport and embedding, but it is **not encryption**: anyone can decode Base64.

#### Base64 decode

Converts a Base64 string back into UTF-8 text.

#### AES-GCM encryption and decryption

AES-GCM is the recommended confidentiality option. The tool:

1. Accepts a plaintext payload and a key/password.
2. Derives a 256-bit AES key with PBKDF2 using SHA-256 and 120,000 rounds.
3. Generates a fresh 16-byte salt and 12-byte IV using `crypto.getRandomValues`.
4. Encrypts the payload with AES-GCM.
5. Packages the salt, IV, and ciphertext into one Base64 result.

To decrypt, use the same algorithm and password with the complete generated Base64 result. The key/password is never stored.

#### AES-CBC encryption and decryption

AES-CBC is included for compatibility with systems that require it. It uses the same password-based PBKDF2 derivation and packages a fresh salt, 16-byte IV, and ciphertext into the output.

Use AES-GCM for new work whenever possible. AES-CBC does not provide authenticated integrity in the same way AES-GCM does, so it is less suitable for untrusted or tamper-sensitive payloads.

#### SHA-256 hash

Creates a one-way SHA-256 fingerprint as lowercase hexadecimal. Hashing does not use a password and cannot be decrypted. It is useful for checksums, fingerprints, and comparing content without displaying the original value.

### Key/password handling

AES operations expose a **Key / password** input. The current implementation accepts a passphrase and derives a cryptographic key locally with PBKDF2; it does not transmit or persist the passphrase. The same algorithm and password are required to decrypt a generated payload.

Raw binary key import is not currently exposed in the UI. For integrations that already use a raw key, a future key-format mode can be added without changing the existing password format.

## Privacy and security

- All JSON and crypto processing happens in the browser tab.
- There is no backend, authentication, database, API integration, analytics, or account requirement.
- No payloads, passwords, keys, salts, or IVs are uploaded or saved by the app.
- AES salts and IVs are generated with the browser's secure random source and are included in the encrypted output so the payload is self-contained.
- Base64 is encoding, not encryption.
- SHA-256 is one-way and cannot be decrypted.
- Use a strong, unique password for AES encryption and treat the generated encrypted string as sensitive data.

The only external resource referenced by the page is Google Fonts. If font loading is unavailable, local fallback fonts are used and all utilities continue to work.

## Tech stack

- React 19
- TypeScript
- Vite
- Browser Web Crypto API
- Plain CSS with responsive media queries
- Bun for package installation and scripts

## Getting started

### Requirements

- Bun 1.x, or a recent Node.js installation capable of running the project scripts
- A modern browser with JavaScript enabled
- A secure browser context for Web Crypto operations; the Freebuff preview and normal localhost development provide this in supported browsers

### Install dependencies

```bash
bun install
```

### Start locally

```bash
bun run dev
```

For the Freebuff isolated preview, the configured command is:

```bash
bun run dev -- --host 0.0.0.0 --port $PORT
```

Freebuff supplies the isolated preview port automatically. The command binds to `0.0.0.0` so the workspace UI can reach Vite.

### Typecheck

```bash
bun run typecheck
```

Equivalent direct check:

```bash
bun tsc -b --noEmit
```

### Build

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
├── JsonUtilities/
│   └── JsonWorkbench.tsx        # JSON Utilities workbench and JSON operations
├── Decrypt-utilities/
│   └── DecryptUtilities.tsx     # Base64, AES-GCM, AES-CBC, and SHA-256 tools
├── src/
│   ├── App.tsx                  # Top-level utility switcher
│   ├── index.css                # Shared theme plus both utility workspaces
│   ├── main.tsx                 # React entrypoint
│   └── vite-env.d.ts             # Vite client type declarations
├── index.html                    # Vite HTML entrypoint and page metadata
├── package.json                  # Scripts and dependencies
├── vite.config.ts                # React-enabled Vite configuration
├── tsconfig*.json                # TypeScript project configuration
└── .gitignore                    # Dependency, build, and environment ignores
```

## Preview configuration

| Setting | Command / value |
| --- | --- |
| Install | `bun install` |
| Preview | `bun run dev -- --host 0.0.0.0 --port $PORT` |
| Preview port metadata | `5173` |
| Build | `bun run build` |

## Future extensions

Potential additions include raw key import/export, JSONPath querying, JSON Schema validation, JSON Patch generation, YAML conversion, CSV conversion, URL encoding helpers, PBKDF2 parameter controls, and saved local workspaces.
