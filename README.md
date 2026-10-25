# @akalin/storage_module

Standalone, reusable Cloud Storage (Google Drive, Microsoft OneDrive, Dropbox) management module for the Akalin ecosystem and Webakus ERP applications.

## Features
- **Multi-Provider Support**: Google Drive, Microsoft OneDrive, Dropbox OAuth integration.
- **Standalone Cloud Explorer**: File browsing, searching, recursive directory navigation, rename, delete, and download.
- **Document Attachment Integration**: Attach files to transactions, invoices, cards, or temporary drafts via `documentGuid`, `documentId`, `documentType`, `documentNo`.
- **Upload Progress Engine**: Chunked/progress-tracked file uploads with cancel support.
- **Dual UI Modes**: Full-page explorer (`/araclar/bulut-dosyalari`) or modal attachment bridge.
- **Admin Configuration**: Provider OAuth credentials (Client ID / Client Secret) setup with step-by-step console guide.
- **Zero Monolithic Dependencies**: Full abstraction through `IStorageServiceAdapter` (REST and LocalStorage adapters provided out of the box).
- **Module Core Compliant**: Registers automatically into `@akalin/module_core` via `createStorageModule()`.

## Installation & Usage

```tsx
import { createStorageModule, createRestStorageAdapter } from '@akalin/storage_module';

const storageModule = createStorageModule({
  appName: 'Webakus ERP',
  adapter: createRestStorageAdapter()
});
```
