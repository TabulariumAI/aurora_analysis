# Aurora Analysis

Aurora Analysis provides a React title-report workflow for linking document sessions, generating title analysis, tracking progress, and presenting report chains in the Tabularium AI platform.

It is a host-integrated package. The host provides authentication, API gateway configuration, batch/session context, and presentation framing. Aurora service implementations, credentials, customer documents, and live storage URLs are not included.

## Features

- Link document sessions to a title-report batch
- Generate and poll title analysis
- Track generation progress and loading state
- Present report chains, records, completeness, conveyances, encumbrances, and issues

## Requirements

- Node.js 22
- npm
- A sibling `aurora_core` checkout, which provides the local `aurora-core` dependency used during development

## Install

```sh
npm install
```

## Use

The package exports `TitleReportPanel`, `useTitleReportStore`, and the title-report types.

```tsx
import { TitleReportPanel } from "aurora-analysis";
```

See the exported prop types in [`src/public-api.ts`](src/public-api.ts). The host must supply valid credentials and compatible gateway endpoints.

## Development

```sh
npm install
npm run test:vitest
npm run typecheck
npm run lint:boundary
npm run build
```

## Public Repository Notes

Do not commit credentials, authorization headers, SAS tokens, generated build output, test results, coverage, local environment files, live storage URLs, or customer documents. Test fixtures must use non-routable URLs.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
