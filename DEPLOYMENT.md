# Deploying to Vercel - Complete Guide

## ✅ VERCEL SERVERLESS SETUP COMPLETE

Your application has been converted to Vercel Serverless functions! All Express routes are now individual serverless endpoints.

## 📁 New Project Structure

```
Talia/
├── api/                          # Serverless functions (replaces Express routes)
│   ├── submit.js                 # POST /api/submit
│   ├── check-duplicate.js        # POST /api/check-duplicate
│   ├── approve.js                # GET /api/approve
│   └── health.js                 # GET /api/health
├── lib/                          # Shared utilities
│   ├── sharepoint.js            # SharePoint operations
│   ├── email.js                 # Email sending
│   └── pdf.js                   # PDF generation
├── vercel.json                   # Vercel configuration
├── individual.html               # Front-end (updated URLs)
├── business.html                 # Front-end (updated URLs)
├── index.html                    # Landing page
├── server.js                     # Old Express server (keep for local testing)
└── package.json                  # Updated dependencies
```

## ⚠️ IMPORTANT: API Keys Security

Your API keys are NOW SECURE! ✅
- All secrets are in `.env` file (excluded from Git)
- `config.js` now reads from environment variables
- You'll set these as environment variables in Vercel

## 🚀 Deployment Steps

### Step 1: Install Updated Dependencies

```powershell
npm install
```

This will install the new `formidable` package needed for Vercel serverless file uploads.

### Step 2: Test Locally (Optional but Recommended)

```powershell
npm start
```

Visit http://localhost:3000 to test the forms before deploying.

### Step 3: Commit Your Code to Git

```powershell
git add .
git commit -m "Convert to Vercel serverless functions"
git push origin main
```

### Step 4: Deploy to Vercel

#### Option A: Deploy from Git (Recommended)

1. **Sign up/Login to Vercel**:
   - Go to https://vercel.com
   - Sign up with GitHub (recommended) or email

2. **Import Project**:
   - Click "Add New" → "Project"
   - Select your GitHub repository (`ODInternational04/pre-trade`)
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset**: Select "Other"
   - **Root Directory**: Leave as `.`
   - **Build Command**: Leave empty (or `npm install`)
   - **Output Directory**: Leave as `.`
   - **Install Command**: `npm install`

4. **Add Environment Variables** (CRITICAL STEP):
   
   Click "Environment Variables" and add each one from your `.env` file:

   ```
   SHAREPOINT_SITE_URL=https://ibvza.sharepoint.com/sites/AINexGen
   SHAREPOINT_TENANT_ID=your-actual-tenant-id
   SHAREPOINT_CLIENT_ID=your-actual-client-id
   SHAREPOINT_CLIENT_SECRET=your-actual-client-secret
   SHAREPOINT_DOCUMENT_LIBRARY=Gold Pre-Trade Clients
   SHAREPOINT_SITE_NAME=AINexGen
   EMAIL_TENANT_ID=your-actual-tenant-id
   EMAIL_CLIENT_ID=your-actual-client-id
   EMAIL_CLIENT_SECRET=your-actual-client-secret
   EMAIL_FROM=infoainexgen@ibvglobal.com
   EMAIL_LEGAL_TEAM=magenta.naidoo@ainexgensa.co.za
   ```

   ⚠️ **IMPORTANT**: 
   - Copy the actual values from your `.env` file, NOT the placeholders above!
   - Set these for **Production**, **Preview**, and **Development** environments

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment (usually 1-2 minutes)
   - You'll receive a URL like: `https://pre-trade.vercel.app`

#### Option B: Deploy with Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts and set environment variables when asked

# For production deployment
vercel --prod
```

### Step 5: Update BASE_URL Environment Variable

After deployment, add one more environment variable in Vercel dashboard:

```
BASE_URL=https://your-project-name.vercel.app
```

Then redeploy (or wait for auto-redeploy if you have GitHub integration).

### Step 6: Test Your Deployment

1. Visit `https://your-project-name.vercel.app/index.html`
2. Test health check: `https://your-project-name.vercel.app/api/health`
3. Submit a test form
4. Check SharePoint for uploaded files
5. Verify email was sent

## 📋 What Changed?

### Frontend (HTML files)
- ✅ Updated API calls from `http://localhost:3000/...` to `/api/...`
- ✅ Now uses relative URLs (works in both local and production)

### Backend
- ✅ Converted Express routes to Vercel serverless functions
- ✅ Extracted shared code into `lib/` modules
- ✅ Uses `/tmp` for temporary files (Vercel ephemeral storage)
- ✅ Added `formidable` for multipart form parsing

### Configuration
- ✅ Added `vercel.json` for deployment configuration
- ✅ Added `formidable` to `package.json`
- ✅ API routes handle CORS automatically

## 🔍 How It Works

### Vercel Serverless Architecture

1. **Each API endpoint is a separate function**:
   - `/api/submit` → `api/submit.js`
   - `/api/check-duplicate` → `api/check-duplicate.js`
   - `/api/approve` → `api/approve.js`
   - `/api/health` → `api/health.js`

2. **Functions are deployed globally on Vercel's CDN**

3. **Temporary files use `/tmp` directory**:
   - Vercel provides ephemeral `/tmp` storage
   - Files are automatically cleaned up after function execution

4. **Environment variables are injected at runtime**

5. **Static files (HTML, CSS, images) are served from root**

## ⚙️ Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

## 🚨 Vercel Limitations to Know

### 1. Function Execution Time
- **Hobby Plan**: 10 seconds max
- **Pro Plan**: 60 seconds max
- **Solution**: Your functions should complete well within 10s

### 2. Request Body Size
- **Default**: 4.5 MB
- **Max with config**: 4.5 MB on Hobby, higher on Pro
- **Solution**: Your file uploads should work fine for typical documents

### 3. Temporary Storage
- **Available**: `/tmp` directory
- **Size**: ~500 MB
- **Lifecycle**: Cleared after function execution
- **Solution**: Files are uploaded to SharePoint and immediately cleaned up

### 4. Cold Starts
- Functions may take 1-2 seconds to "wake up" if not used recently
- **Solution**: Acceptable for form submissions

## 🛠️ Troubleshooting

### Issue: "Cannot find module"
**Solution**: 
```powershell
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue: Environment variables not working
**Solution**: 
1. Check they're set correctly in Vercel dashboard
2. Redeploy after adding/changing variables
3. Check variable names match exactly (case-sensitive)

### Issue: File uploads failing
**Solution**: 
1. Check file size (should be < 4.5 MB)
2. Check Vercel function logs for errors
3. Verify SharePoint permissions are correct

### Issue: "Failed to fetch" errors
**Solution**: 
1. Check browser console for CORS errors
2. Verify API endpoints are accessible: `/api/health`
3. Check Vercel deployment logs for backend errors

### Issue: 504 Gateway Timeout
**Solution**: 
- Function is taking > 10 seconds
- Check function logs in Vercel dashboard
- May need to optimize file upload/PDF generation
- Consider upgrading to Pro for 60s limit

## 📊 Monitoring Your Deployment

### Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click your project
3. View:
   - **Deployments**: History of all deployments
   - **Functions**: Real-time logs and analytics
   - **Settings**: Environment variables, domains

### Viewing Logs
1. In Vercel dashboard → Your Project
2. Click "Functions" tab
3. Click on a function (e.g., `submit`)
4. View real-time logs and invocations

### Setting Up Monitoring
1. Go to Project Settings → Integrations
2. Add monitoring tools like:
   - Sentry (error tracking)
   - LogDNA (log management)
   - DataDog (performance monitoring)

## 🔐 Security Checklist

- ✅ `.env` file is in `.gitignore`
- ✅ `config.js` uses `process.env` variables
- ✅ Environment variables set in Vercel dashboard
- ✅ No secrets in committed code
- ✅ CORS headers properly configured
- ✅ Azure AD permissions properly scoped

## 🎯 Testing Checklist

After deployment, test:

- [ ] Landing page loads: `https://your-app.vercel.app/`
- [ ] Health check works: `https://your-app.vercel.app/api/health`
- [ ] Individual form loads
- [ ] Business form loads
- [ ] Submit individual application
- [ ] Submit business application
- [ ] Check duplicate detection works
- [ ] Verify files uploaded to SharePoint
- [ ] Verify email sent to legal team
- [ ] Click approval link in email
- [ ] Verify approval PDF generated

## 🌐 Custom Domain (Optional)

To use your own domain:

1. Go to Project Settings → Domains
2. Add your domain (e.g., `applications.ibvglobal.com`)
3. Follow instructions to update DNS records
4. Vercel automatically provisions SSL certificate

## 🔄 Continuous Deployment

With GitHub integration:
- Every push to `main` branch auto-deploys to production
- Pull requests create preview deployments
- Automatic rollback available if issues occur

## 📞 Support

### Vercel Documentation
- Docs: https://vercel.com/docs
- Functions: https://vercel.com/docs/functions
- Limits: https://vercel.com/docs/concepts/limits/overview

### Getting Help
1. Vercel Dashboard → Support (Pro plan)
2. Vercel Community: https://github.com/vercel/vercel/discussions
3. Check function logs for detailed error messages

## 🎉 You're Ready!

Your application is now:
- ✅ Serverless and scalable
- ✅ Globally distributed on CDN
- ✅ Auto-deploys on git push
- ✅ Secure with environment variables
- ✅ Ready for production use

## 📝 Common Commands

```powershell
# Test locally
npm start

# Deploy to Vercel (if using CLI)
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# See environment variables
vercel env ls

# Pull environment to local
vercel env pull
```

---

**Questions or Issues?**
Check the Vercel dashboard function logs - they show detailed error messages for debugging.

