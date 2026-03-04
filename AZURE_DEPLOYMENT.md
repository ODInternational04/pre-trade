# Azure Static Web Apps Deployment Guide

## ✅ PROJECT CONVERTED TO AZURE STATIC WEB APPS

Your application is now ready for Azure Static Web Apps! All code has been converted from Express to serverless functions.

## 📁 New Project Structure

```
Talia/
├── api/                          # Azure Serverless Functions
│   ├── submit.js                 # POST /api/submit (file upload handler)
│   ├── check-duplicate.js        # POST /api/check-duplicate
│   ├── approve.js                # GET /api/approve  
│   └── health.js                 # GET /api/health
├── lib/                          # Shared Utilities
│   ├── sharepoint.js            # SharePoint operations (upload, search, etc.)
│   ├── email.js                 # Email sending via Microsoft Graph
│   └── pdf.js                   # PDF generation (Client Info & Approval)
├── staticwebapp.config.json      # Azure Static Web Apps configuration
├── individual.html               # Individual application form
├── business.html                 # Business application form
├── index.html                    # Landing page
├── styles.css                    # Shared styles
├── server.js                     # OLD Express server (keep for local testing)
└── package.json                  # Dependencies
```

## 🚀 DEPLOYMENT STEPS

### Step 1: Commit Your Code to GitHub

```powershell
# Stage all new files
git add .

# Commit changes
git commit -m "Convert to Azure Static Web Apps serverless functions"

# Push to GitHub
git push origin main
```

### Step 2: Create Azure Static Web App

#### Option A: Azure Portal (Recommended for Beginners) 🌐

1. **Sign in to Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your Microsoft 365 account

2. **Create Static Web App**
   - Click "Create a resource"
   - Search for "Static Web Apps"
   - Click "Create"

3. **Configure Basic Settings**
   - **Subscription**: Select your subscription
   - **Resource Group**: Create new or select existing
     - Suggested name: `pre-trade-rg`
   - **Name**: `pre-trade-app` (or your preferred name)
   - **Plan type**: **Free** (perfect for your use case!)
   - **Region**: Choose closest to South Africa (e.g., "South Africa North" or "West Europe")

4. **Configure Deployment**
   - **Source**: Select **GitHub**
   - Click "Sign in with GitHub" (authorize if prompted)
   - **Organization**: `ODInternational04`
   - **Repository**: `pre-trade`
   - **Branch**: `main`

5. **Build Details**
   - **Build Presets**: Select "Custom"
   - **App location**: `/` (root folder)
   - **Api location**: `/api`
   - **Output location**: leave EMPTY

6. **Review + Create**
   - Click "Review + create"
   - Click "Create"
   - Wait 2-3 minutes for deployment

7. **Get Your URL**
   - Once created, go to the resource
   - Copy the URL (e.g., `https://pre-trade-app.azurestaticapps.net`)

#### Option B: Azure CLI (For Advanced Users) 💻

```powershell
# Install Azure CLI (if not already installed)
winget install Microsoft.AzureCLI

# Login to Azure
az login

# Create resource group
az group create --name pre-trade-rg --location southafricanorth

# Create Static Web App
az staticwebapp create \
  --name pre-trade-app \
  --resource-group pre-trade-rg \
  --source https://github.com/ODInternational04/pre-trade \
  --location southafricanorth \
  --branch main \
  --app-location "/" \
  --api-location "/api" \
  --output-location "" \
  --login-with-github
```

### Step 3: Configure Environment Variables ⚙️

**CRITICAL STEP!** Your API won't work without these variables.

1. **In Azure Portal:**
   - Go to your Static Web App resource
   - Click "Configuration" in the left menu
   - Click "Application settings"

2. **Add these environment variables:**

   ```
   SHAREPOINT_TENANT_ID=your_tenant_id
   SHAREPOINT_CLIENT_ID=your_client_id
   SHAREPOINT_CLIENT_SECRET=your_client_secret
   SHAREPOINT_SITE_URL=https://ibvza.sharepoint.com
   SHAREPOINT_SITE_NAME=AINexGen
   SHAREPOINT_DOCUMENT_LIBRARY=Pre-Trade Applications
   
   EMAIL_TENANT_ID=your_email_tenant_id
   EMAIL_CLIENT_ID=your_email_client_id
   EMAIL_CLIENT_SECRET=your_email_client_secret
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_LEGAL_TEAM=legal@yourdomain.com
   
   BASE_URL=https://pre-trade-app.azurestaticapps.net
   NODE_ENV=production
   ```

3. **Where to find your values:**
   - Copy from your current Railway environment variables
   - Or from your `.env` file (but NEVER commit `.env` to GitHub!)

4. **Save changes:**
   - Click "Save" at the top
   - Wait ~1 minute for changes to apply

**Using Azure CLI:**

```powershell
az staticwebapp appsettings set \
  --name pre-trade-app \
  --resource-group pre-trade-rg \
  --setting-names \
    SHAREPOINT_TENANT_ID="your_value" \
    SHAREPOINT_CLIENT_ID="your_value" \
    SHAREPOINT_CLIENT_SECRET="your_value" \
    EMAIL_TENANT_ID="your_value" \
    EMAIL_CLIENT_ID="your_value" \
    EMAIL_CLIENT_SECRET="your_value" \
    BASE_URL="https://pre-trade-app.azurestaticapps.net"
```

### Step 4: Test Your Deployment 🧪

1. **Visit your site:**
   ```
   https://pre-trade-app.azurestaticapps.net
   ```

2. **Test health endpoint:**
   ```
   https://pre-trade-app.azurestaticapps.net/api/health
   ```
   
   Should return:
   ```json
   {
     "status": "OK",
     "env_check": "all_present",
     "platform": "Azure Static Web Apps"
   }
   ```

3. **Test form submission:**
   - Go to `/individual.html` or `/business.html`
   - Fill out a test form
   - Submit and verify:
     - Files upload to SharePoint
     - Email is sent to legal team
     - Client Information PDF is created

### Step 5: Update DNS (Optional) 🌐

If you want a custom domain like `pre-trade.yourdomain.com`:

1. In Azure Portal → Your Static Web App
2. Click "Custom domains"
3. Click "Add"
4. Follow the instructions to:
   - Add CNAME record to your DNS
   - Validate domain ownership
   - SSL certificate is automatically provisioned (FREE!)

### Step 6: Cancel Railway 💰

Once everything works on Azure:

1. Go to https://railway.app
2. Select your project
3. Settings → Delete Project
4. **Save $5/month!** 🎉

## 📊 Your URLs After Deployment

```
Landing Page:     https://pre-trade-app.azurestaticapps.net/
Individual Form:  https://pre-trade-app.azurestaticapps.net/individual.html
Business Form:    https://pre-trade-app.azurestaticapps.net/business.html

API Endpoints:
Health Check:     https://pre-trade-app.azurestaticapps.net/api/health
Check Duplicate:  https://pre-trade-app.azurestaticapps.net/api/check-duplicate
Submit Form:      https://pre-trade-app.azurestaticapps.net/api/submit
Approve:          https://pre-trade-app.azurestaticapps.net/api/approve
```

## 🔄 Future Updates

Every time you push to GitHub, Azure automatically deploys:

```powershell
# Make changes to your code
# Commit and push
git add .
git commit -m "Your update message"
git push origin main

# Azure automatically redeploys in ~2 minutes!
```

## 🛠️ Local Development

Test locally before deploying:

```powershell
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Create .env file with your environment variables
# (Never commit this file!)

# Start local development server
npm start

# Or use Azure SWA CLI
swa start . --api-location ./api
```

Visit: http://localhost:3000

## ⚙️ Configuration Files Explained

### staticwebapp.config.json
Configures routing, headers, and runtime:
- Routes API calls to `/api/*`
- Sets CORS headers
- Redirects `/approve` to `/api/approve`
- Handles 404s gracefully

### package.json
All dependencies remain the same - no changes needed!

## 🆘 Troubleshooting

### Health check shows "missing_vars"
- **Solution**: Add environment variables in Azure Portal → Configuration

### Files not uploading
- **Check**: SharePoint credentials in environment variables
- **Check**: Document library name is correct
- **Check**: Azure function logs in Portal → Log Stream

### Email not sending
- **Check**: Email credentials in environment variables
- **Check**: Microsoft Graph API permissions

### 500 errors
- **Solution**: Check logs in Azure Portal:
  - Your Static Web App → Functions → Pick a function → Monitor
  - Look for detailed error messages

### View Logs in Azure Portal
1. Go to your Static Web App
2. Click "Log Stream" in left menu
3. Watch real-time logs as requests come in

## 💡 Benefits of Azure Static Web Apps

✅ **FREE** with M365 subscription  
✅ **Automatic HTTPS** with SSL certificate  
✅ **Global CDN** for fast performance  
✅ **Auto-deployments** from GitHub  
✅ **Integrated** with Microsoft ecosystem  
✅ **Serverless scaling** - handles traffic spikes  
✅ **No cold starts** on standard tier  
✅ **Built-in staging** environments for testing  

## 📈 Monitoring & Analytics

View your app's performance:

1. Azure Portal → Your Static Web App
2. Click "Metrics" to see:
   - Request count
   - Data transfer
   - Function execution time
   - Errors

## 🔐 Security Features

- All secrets stored in Azure (not in code)
- Environment variables encrypted at rest
- HTTPS enforced automatically
- Can add Azure AD authentication if needed

## 🎉 You're Done!

Your application is now running on Azure Static Web Apps:
- ✅ Frontend: Hosted
- ✅ Backend: Serverless functions
- ✅ SharePoint: Connected
- ✅ Email: Working
- ✅ Cost: **FREE!**

**Next Steps:**
1. Test thoroughly
2. Share the URL with your team
3. Monitor usage in Azure Portal
4. Enjoy the savings! 💰

---

**Support:**
- Azure Docs: https://aka.ms/swa-docs
- Microsoft Q&A: https://aka.ms/qna

**Created by:** AI Nex Gen for IBV International Vaults  
**Date:** March 2026
