# API Serverless Functions

This folder contains Vercel Serverless Functions that handle all backend operations.

## 📂 Endpoints

### POST /api/submit
**File**: `submit.js`

Handles form submissions (individual and business applications).

**Request**: Multipart form data with:
- Form fields (client information)
- File uploads (documents)
- Signature data (base64)

**Response**:
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "clientFolder": "John Doe_2026-02-15",
  "uploadedFiles": [...],
  "sharePointLink": "https://..."
}
```

**Process**:
1. Parse multipart form data
2. Check for duplicate clients
3. Upload files to SharePoint
4. Generate Client Information PDF
5. Send approval email to legal team

---

### POST /api/check-duplicate
**File**: `check-duplicate.js`

Checks if a client already exists in SharePoint.

**Request**:
```json
{
  "clientName": "John Doe"
}
```

**Response**:
```json
{
  "exists": true,
  "message": "Client 'John Doe' already exists",
  "existingFolders": [
    {
      "name": "John Doe_2026-02-10",
      "createdDate": "2026-02-10T10:30:00Z",
      "webUrl": "https://..."
    }
  ]
}
```

---

### GET /api/approve
**File**: `approve.js`

Approves an application and generates Legal Approval PDF.

**Query Parameters**:
- `client`: Client folder name (e.g., "John Doe_2026-02-15")

**Response**: HTML success page with link to approval document

**Process**:
1. Validate client folder
2. Generate Legal Approval PDF
3. Upload PDF to SharePoint
4. Return success page

---

### GET /api/health
**File**: `health.js`

Health check endpoint for monitoring.

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2026-02-15T12:00:00.000Z",
  "environment": "Vercel Serverless",
  "config": {
    "sharepoint": "https://ibvza.sharepoint.com/sites/AINexGen",
    "documentLibrary": "Gold Pre-Trade Clients",
    "emailFrom": "infoainexgen@ibvglobal.com"
  }
}
```

---

## 🔧 How Serverless Functions Work

Each function:
1. **Receives HTTP request** (GET or POST)
2. **Sets CORS headers** for cross-origin requests
3. **Processes the request** using shared utilities
4. **Returns JSON or HTML response**
5. **Automatically scales** based on traffic

## 📚 Shared Utilities

Functions use shared code from `/lib`:

- **`lib/sharepoint.js`**: SharePoint operations
  - `getAccessToken()` - Get Azure AD token
  - `getGraphClient()` - Initialize Microsoft Graph client
  - `searchExistingClient()` - Search for duplicates
  - `uploadToSharePoint()` - Upload files

- **`lib/email.js`**: Email operations
  - `sendApprovalEmail()` - Send approval request to legal team

- **`lib/pdf.js`**: PDF generation
  - `createClientInfoPDF()` - Generate client information PDF
  - `createApprovalPDF()` - Generate legal approval PDF
  - `createOrUpdateTrackingPDF()` - Track resubmissions

## 🌍 Environment Variables

Functions require these environment variables (set in Vercel dashboard):

```
SHAREPOINT_SITE_URL
SHAREPOINT_TENANT_ID
SHAREPOINT_CLIENT_ID
SHAREPOINT_CLIENT_SECRET
SHAREPOINT_DOCUMENT_LIBRARY
SHAREPOINT_SITE_NAME
EMAIL_TENANT_ID
EMAIL_CLIENT_ID
EMAIL_CLIENT_SECRET
EMAIL_FROM
EMAIL_LEGAL_TEAM
BASE_URL
```

## ⚡ Performance

- **Cold start**: ~1-2 seconds (first invocation)
- **Warm invocation**: ~100-500ms
- **Timeout**: 10 seconds (Hobby), 60 seconds (Pro)
- **Memory**: 1024 MB allocated

## 🔍 Debugging

View function logs:
1. Go to Vercel Dashboard
2. Click your project
3. Go to "Functions" tab
4. Click a function to see logs

Or use Vercel CLI:
```bash
vercel logs
```

## 📝 Local Testing

Functions can be tested locally with Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Run development server
vercel dev

# Access at http://localhost:3000
```

Or use the original Express server:
```bash
npm start
```

## 🚨 Error Handling

All functions include:
- Try-catch blocks for error handling
- Detailed error logging to console
- HTTP status codes (400, 404, 500, etc.)
- User-friendly error messages

Common errors:
- **401 Unauthorized**: Azure AD credentials issue
- **404 Not Found**: SharePoint library not found
- **500 Internal Server Error**: Check function logs
- **504 Gateway Timeout**: Function took > 10 seconds

## 🔐 Security

- CORS headers allow all origins (adjust for production)
- Environment variables are encrypted
- No secrets in code
- Azure AD authentication required for SharePoint/Email
- File uploads use temporary `/tmp` storage
- Files cleaned up after processing
