# CraftSuite

CraftSuite is a unified, static-hosting workspace for four Storytold browser editors:

- **WordCraft 0.14.0** — documents
- **GridCraft 0.15.0** — spreadsheets
- **DeckCraft 0.14.1** — presentations
- **PdfCraft 0.17.0** — PDFs

The workspace provides one responsive home screen and navigation shell. Each editor is kept as its original compiled WebAssembly web distribution under `public/apps/` and is loaded locally in an iframe. The original editor assets and upstream license/notice/attribution files are retained.

## Important architecture note

This package unifies the **web deployment and user entry point**. It does not merge the four upstream Rust codebases into one Rust crate or combine their editor engines into one WASM binary. The four compiled editors remain separate applications hosted together under one site. This approach preserves the supplied builds and avoids pretending that compiled WASM can be source-integrated without the original Rust source and a rebuild.

## Deploy

This is a static site. No Node build step, server, database, API key, account, analytics, or backend is required.

### GitHub Pages

1. Upload the complete contents of this folder to the root of a GitHub repository.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
4. Wait for GitHub Pages to publish the site.

The relative asset paths support a project site hosted below a repository path.

### Cloudflare Pages

1. Create a Pages project connected to the repository.
2. Set the build command to blank / none.
3. Set the build output directory to `/` (repository root).
4. Deploy.

### Other static hosts

Upload the folder as-is. Serve `.wasm` files with the `application/wasm` MIME type. The supplied `_headers` files set this for Cloudflare Pages-compatible hosts; `.htaccess` files are retained for Apache hosting.

## Project layout

```text
CraftSuite/
├── index.html                 # Unified home and app shell
├── styles.css                 # Responsive desktop/tablet/mobile UI
├── app.js                     # Navigation and editor loading
├── manifest.webmanifest
├── assets/
├── public/apps/
│   ├── wordcraft/              # Original compiled web distribution
│   ├── gridcraft/
│   ├── deckcraft/
│   └── pdfcraft/
├── THIRD_PARTY_NOTICES.md
├── LICENSE-MIT
└── LICENSE-APACHE
```

## iPad notes

The shell is responsive and the original applications are browser/WASM builds. Across all four editors, a one-finger drag on the canvas pans the view and a stationary tap still selects or activates items; use a mouse or the editor's controls to move objects. Other iPad Safari compatibility, including memory, file-picker, download, and browser API behavior, still depends on each upstream editor. Test each editor on the target iPad and Safari version before relying on it for important work. This is a browser app/PWA-style static site, not a native iPadOS app.

## Privacy

The CraftSuite shell itself does not send analytics or make network requests to a CraftSuite backend. The editors execute from the hosted files. Their own storage, file handling, and browser behavior remain governed by the upstream implementations. Use the editors' own documentation for their exact persistence/export behavior.

## Upstream documentation

Each app folder retains its upstream `README.md`, `HOSTING.md`, `NOTICE`, applicable `ATTRIBUTION.md`, and license files. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
