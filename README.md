# Icon Bloom SVG Generator

A production-oriented AI SVG icon generator with a Dream Pop Sugar Bloom Y2K interface.

## Phase 0

This phase establishes:

- React + Vite foundation
- Server-side Gemini API boundary
- Secret-safe environment configuration
- Icon response contract
- SVG parsing, validation, and sanitization primitives
- Generation state and error model

Gemini generation itself is intentionally not enabled until Phase 3.

## Security

The Gemini API key must remain server-side. Never use a `VITE_GEMINI_API_KEY` variable or commit a real API key.

Use `GEMINI_API_KEY` in the deployment platform's server environment.

## Development

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```
