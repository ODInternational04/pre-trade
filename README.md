# IBV Gold Pre-Trade Application System

Complete system with SharePoint integration and email approval workflow.

## ✅ Configuration Complete

Your system is configured with:
- **SharePoint Site**: https://ibvza.sharepoint.com/sites/AINexGen
- **Document Library**: Gold PreTrade Clients
- **Email From**: infoainexgen@ibvglobal.com
- **Legal Team**: magenta.naidoo@ainexgensa.co.za

## 🚀 Quick Start

### 1. Install Dependencies

Open PowerShell in this folder and run:

```powershell
npm install
```

This will install:
- express (web server)
- multer (file uploads)
- @azure/msal-node (Azure AD authentication)
- @microsoft/microsoft-graph-client (SharePoint/Email access)
- pdfkit (PDF generation)

### 2. Start the Server

```powershell
npm start
```

You should see:
```
🚀 IBV Gold Pre-Trade Application System
✓ Server running on http://localhost:3000
✓ Azure AD authentication configured
✓ SharePoint: https://ibvza.sharepoint.com/sites/AINexGen
✓ Document Library: Gold PreTrade Clients
✓ Email from: infoainexgen@ibvglobal.com
✓ Legal team: magenta.naidoo@ainexgensa.co.za
```

### 3. Access the Forms

Open your browser and go to:
- **Landing Page**: http://localhost:3000/index.html
- **Individual Form**: http://localhost:3000/individual.html
- **Business Form**: http://localhost:3000/business.html

## 📋 How It Works

### 1. Client Submits Application
- Client visits the landing page and selects Individual or Business
- Fills out all required information
- Uploads required documents
- System checks SharePoint for duplicate clients
- If duplicate found, shows warning and asks to proceed
- Submits application

### 2. Files Upload to SharePoint
- Creates folder: `[Client Name]_[Date]`
- Uploads all documents to the folder
- Example: `John Smith_2026-02-14`

### 3. Email Sent to Legal Team
- Professional email sent to: magenta.naidoo@ainexgensa.co.za
- Contains:
  - Client details
  - Link to SharePoint folder
  - **APPROVE APPLICATION** button

### 4. Legal Team Approves
- Clicks "APPROVE APPLICATION" button in email
- System generates Legal_Approval.pdf
- PDF uploaded to client's folder in SharePoint
- Shows success page with link to approval document

## 🔍 Testing the System

### Test Health Check
Open browser: http://localhost:3000/health

Should return:
```json
{
  "status": "OK",
  "timestamp": "2026-02-14T...",
  "config": {
    "sharepoint": "https://ibvza.sharepoint.com/sites/AINexGen",
    "documentLibrary": "Gold PreTrade Clients",
    "emailFrom": "infoainexgen@ibvglobal.com"
  }
}
```

### Test Form Submission
1. Fill out individual or business form
2. Upload test documents (PDFs, images)
3. Submit
4. Check console output for progress
5. Check SharePoint for new folder
6. Check email for approval request

## 📁 SharePoint Folder Structure

```
Gold PreTrade Clients/
├── John Smith_2026-02-14/
│   ├── ID_Document.pdf
│   ├── Proof_of_Residence.pdf
│   ├── Bank_Proof.pdf
│   └── Legal_Approval.pdf (after approval)
│
├── ABC Company_2026-02-14/
│   ├── Representative_ID.pdf
│   ├── Certificate_of_Incorporation.pdf
│   ├── MOI.pdf
│   ├── Director_IDs/
│   └── Legal_Approval.pdf (after approval)
```

## 🔧 Configuration Files

### config.js
Contains all credentials and settings. Already configured with your details.

### server.js
Main server application. Handles:
- Form submissions
- SharePoint uploads
- Email sending
- Duplicate checking
- Approval processing

### package.json
Dependencies and scripts.

## 🛠️ Troubleshooting

### Error: "Cannot find module"
**Solution**: Run `npm install` again

### Error: "Port 3000 already in use"
**Solution**: Change port in config.js or kill the process:
```powershell
Get-Process -Name node | Stop-Process -Force
```

### Error: "Access denied to SharePoint"
**Solution**: Check that API permissions are granted in Azure AD:
- Go to Azure Portal → App registrations → Pre-Trade Register
- Click "API permissions"
- Verify "Sites.ReadWrite.All" shows "Granted"
- If not, ask admin to grant consent

### Error: "Cannot send email"
**Solution**: Check that API permissions are granted:
- Verify "Mail.Send" permission is granted in Azure AD

### Files not uploading
**Solution**: 
1. Check SharePoint document library name matches: "Gold PreTrade Clients"
2. Verify the library exists in the site
3. Check console for detailed error messages

## 📧 Email Preview

The approval email will look like:

```
Subject: 🔔 New Individual Application for Approval - John Smith

[Professional HTML email with:]
- Client Name
- Application Type
- Submission Date
- Folder Name
- [📁 View Documents in SharePoint] button
- [✅ APPROVE APPLICATION] button
```

## 🔐 Security Notes

1. **Client Secret**: Never commit config.js to public repositories
2. **HTTPS**: Use HTTPS when deploying to production
3. **Update baseUrl**: Change `config.server.baseUrl` in config.js when deploying

## 🚀 Deployment to Production

### Update config.js:
```javascript
server: {
    port: 80, // or 443 for HTTPS
    baseUrl: 'https://yourdomain.com'
}

email: {
    legalTeam: 'legal@ibvglobal.com' // Update to production email
}
```

### Install as Windows Service (Optional):
```powershell
npm install -g node-windows
npm link node-windows
```

## 📞 Support

If you encounter issues:
1. Check server console for error messages
2. Check browser console (F12) for frontend errors
3. Verify Azure AD permissions are granted
4. Test SharePoint access manually
5. Verify email account can send emails

## 📝 Files in This Project

- `index.html` - Landing page
- `individual.html` - Individual application form
- `business.html` - Business application form
- `styles.css` - Shared styles
- `server.js` - Backend server
- `config.js` - Configuration (credentials)
- `package.json` - Dependencies
- `README.md` - This file

## ✅ Checklist

- [x] Azure AD app registration created
- [x] API permissions granted
- [x] SharePoint document library created
- [x] Configuration files created
- [x] Forms connected to backend
- [x] Duplicate checking implemented
- [x] Email approval workflow configured
- [ ] Dependencies installed (`npm install`)
- [ ] Server started (`npm start`)
- [ ] System tested

---

**IBV Gold Pre-Trade Application System**  
AI Nex Gen | IBV International Vaults  
Version 1.0.0
