# @akalin/file_manager_module

**Local & Cloud File Import, Export & Storage Manager**  
*(Yerel & Bulut Dosya Al / Kaydet / Yönet Modülü)*

Standalone, reusable Local & Multi-Provider Cloud File Management (Import, Export, Google Drive, Microsoft OneDrive, Dropbox) module for the Akalin ecosystem and Webakus ERP applications.

## Features
- **File Import Page (`FileImportPage`)**:
  - Local drag & drop or cloud file selection (`FilesOnClouds`).
  - Built-in file type filtering (`all`, `excel`, `pdf`, `image`, `word`, `csv`, `json`, `xml`, `archive`, or custom extensions).
  - Single (`single`) or multiple (`multiple`) file selection modes.
  - Optional Excel sheet & column mapping mode with AI auto-matching (`columns` prop).
  - Automatic cloud backup toggle (`Buluta Kaydet`) during local file import.
- **File Export Page (`FileExportPage`)**:
  - Customizable file name and export format (`xlsx`, `csv`, `pdf`, `json`, `xml`, `txt`).
  - Save to local device (**Bilgisayara İndir**), save to cloud folder (**Bulut Depolamaya Kaydet**), or both simultaneously.
  - Column selection and live table preview when exporting tabular data.
- **Multi-Provider Cloud Storage**: Google Drive, Microsoft OneDrive, Dropbox OAuth integration.
- **Standalone Cloud Explorer**: File browsing, searching, recursive directory navigation, rename, delete, and download.
- **Document Attachment Integration**: Attach files to transactions, invoices, cards, or temporary drafts via `documentGuid`, `documentId`, `documentType`, `documentNo`.

## Installation & Usage

```tsx
import {
  createFileManagerModule,
  createRestStorageAdapter,
  FileImportPage,
  FileExportPage,
} from '@akalin/file_manager_module';

const fileManagerModule = createFileManagerModule({
  appName: 'Webakus ERP',
  adapter: createRestStorageAdapter()
});
```
