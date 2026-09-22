# SooQuoting workflow changes

## Using the updated workflows

- **Issue & email DO + Invoice** creates both records in one operation, saves them, and opens a single email with both PDFs selected. Review the recipient and click **Send DO + Invoice together**. Reopening the action reuses the existing documents instead of generating duplicates. Google sign-in is required to send.
- **Expired** contains the latest unaccepted quotations whose valid-until date has passed. A quote remains valid through that date in the browser's local time. The tracker refreshes on opening the app, every 30 seconds, and on window focus. Quotes with a PO or issued documents, paid quotes and cancelled quotes are not automatically expired.
- **Mark paid** targets the invoice on that row or in that preview by its exact ID. Other invoices remain unchanged. A quotation becomes Paid only when all its linked invoices are paid. Legacy duplicate IDs are rejected rather than guessed.
- **Revise** creates a saved Draft with a new ID and a number such as QT-2026-001-R1, then opens the editor. Each subsequent revision increments the suffix. Cancelling the editor leaves that draft available in the list. Earlier versions remain in **Earlier versions** and the preview's version history. Sending quotations is restricted to the latest valid version.
- Invoice and DO PDF/HTML content comes from the issued records, so later quote revisions cannot change their customer, items or amounts.

## Persistence

Document mutations use the same save path. Requests are serialized within a browser. A complete pending snapshot is retained in localStorage until the server acknowledges it; loading does not overwrite pending changes with old server data. The status banner exposes saving/failure and a Retry save action. Automatic expiry is calculated from dates, so it remains correct after reloading without a server scheduler.

This retains the existing full-database API and single-company storage format; it does not add multi-device conflict resolution or authentication. Revision fields are optional, so existing records continue to load. Existing payment statuses are not automatically changed based on guesses about past mistakes.

## Development and checks

Use npm with package-lock.json:

- npm ci
- npm test
- npm run lint
- npm run build
- npm run dev

For production, set NODE_ENV=production and DATA_DIR to the intended persistent database directory before npm start. Back up the actual database before deploying an updated build.

Tests cover expiry boundaries, combined issuance/reuse, invoice payment isolation, duplicate-ID safeguards, revision history, issued-document snapshots, MIME attachments, and save ordering/recovery. Browser checks used a separate local test database; they verified Expired navigation, R1/R2 creation and original pricing, both attachments in the email composer, and payment isolation after reload. No customer email was sent during testing.

