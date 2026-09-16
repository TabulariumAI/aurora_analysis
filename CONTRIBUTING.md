# Contributing

## Requirements

- Node.js 22
- npm
- A sibling `aurora_core` checkout

## Local checks

```sh
npm install
npm run test:vitest
npm run typecheck
npm run lint:boundary
npm run build
```

## Guidelines

- Preserve host ownership of authentication, API gateway configuration, batch/session context, and framing.
- Keep title-report session linking, generation, polling, progress, and report presentation in the title-report feature.
- Add or update tests for behavior changes.
- Do not commit generated build output, coverage, test results, package tarballs, credentials, live storage URLs, or customer documents.
