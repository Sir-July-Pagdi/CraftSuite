# Deployment checklist

- [ ] Upload the entire repository; do not upload only `index.html`.
- [ ] Confirm all four `public/apps/*/` directories and their `.wasm` files are present in GitHub.
- [ ] Configure static hosting with the repository root as the output directory.
- [ ] Confirm the host serves `.wasm` as `application/wasm`.
- [ ] Open the home page and launch each editor.
- [ ] Test create/open/save/export workflows in each editor.
- [ ] Test touch, keyboard, file selection, downloads, rotation, and memory use on the target iPad.
- [ ] Keep all per-app license, notice, attribution, and font license files.

A successful home-page load is not proof that every editor feature works on every browser. Validate each editor's actual workflows on the intended devices.
