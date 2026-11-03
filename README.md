# CTO Client Management Roadmap

A browser-only Excel-to-PDF roadmap builder. The app reads an Excel workbook locally, previews the detected roadmap initiatives, and generates a client-ready PDF without uploading or storing the source file.

## Expected columns

The first worksheet can use common variants of these headings:

- Client
- Initiative
- Category
- Priority
- Status
- Owner
- Start Date
- Target Date
- Notes

The app also provides a downloadable example workbook.

## Local development

```bash
npm install
npm run dev
```

## Privacy

Excel parsing and PDF generation happen entirely in the browser. No client data is sent to a server or persisted by the application.
