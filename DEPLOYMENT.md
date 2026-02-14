# Deploying to Vercel - Step by Step Guide

## ⚠️ IMPORTANT: API Keys Security

Your API keys are NOW SECURE! ✅
- All secrets are in `.env` file (excluded from Git)
- `config.js` now reads from environment variables
- You'll set these as environment variables in Vercel

## 🚀 Deployment Steps

### Step 1: Prepare Your Code

1. **Install Git** (if not already):
   ```bash
   git --version
   ```
   If not installed, download from: https://git-scm.com/

2. **Initialize Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - IBV Gold Application"
   ```

3. **Create GitHub repository** (optional but recommended):
   - Go to https://github.com/new
   - Create a new repository
   - Follow the instructions to push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Sign up/Login to Vercel**:
   - Go to https://vercel.com
   - Sign up with GitHub (recommended) or email

2. **Import Project**:
   - Click "Add New" → "Project"
   - Import your GitHub repository OR import from Git URL

3. **Configure Project**:
   - **Framework Preset**: Select "Other"
   - **Build Command**: Leave empty or use `npm install`
   - **Output Directory**: Leave as `.`
   - **Install Command**: `npm install`

4. **Add Environment Variables** (CRITICAL STEP):
   Click "Environment Variables" and add each one from your `.env` file:

   ```
   SHAREPOINT_SITE_URL=https://ibvza.sharepoint.com/sites/AINexGen
   SHAREPOINT_TENANT_ID=your-tenant-id-here
   SHAREPOINT_CLIENT_ID=your-client-id-here
   SHAREPOINT_CLIENT_SECRET=your-client-secret-here
   SHAREPOINT_DOCUMENT_LIBRARY=Gold Pre-Trade Clients
   SHAREPOINT_SITE_NAME=AINexGen
   EMAIL_TENANT_ID=your-tenant-id-here
   EMAIL_CLIENT_ID=your-client-id-here
   EMAIL_CLIENT_SECRET=your-client-secret-here
   EMAIL_FROM=infoainexgen@ibvglobal.com
   EMAIL_LEGAL_TEAM=magenta.naidoo@ainexgensa.co.za
   ```

   ⚠️ **IMPORTANT**: Copy the actual values from your `.env` file, NOT the placeholders shown above!
   
   ⚠️ **Make sure to set these for Production, Preview, and Development environments**

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete (usually 1-2 minutes)

### Step 3: Update URLs

After deployment, you'll receive a URL like: `https://your-project-name.vercel.app`

1. **Update BASE_URL environment variable** in Vercel:
   ```
   BASE_URL=https://your-project-name.vercel.app
   ```

2. **Redeploy** to apply the change

### Step 4: Test Your Deployment

1. Visit `https://your-project-name.vercel.app/index.html`
2. Test form submission
3. Check SharePoint for uploaded files
4. Check email for approval notification

## ⚠️ IMPORTANT LIMITATIONS

### Vercel Serverless Functions

Vercel uses serverless functions, NOT a traditional Node.js server. This means:

1. **File uploads may have size limits** (default 4.5MB body size)
2. **Execution timeouts** (10 seconds for Hobby plan, 60s for Pro)
3. **No persistent file storage** - uploads folder is temporary

### Alternative Hosting Options

If you encounter issues with Vercel, consider these alternatives:

#### Option 1: Railway (Recommended for your use case)
- ✅ Supports traditional Node.js servers
- ✅ No file upload limits
- ✅ Persistent storage
- ✅ Easy deployment

**Railway Deployment**:
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables from `.env`
6. Deploy!

#### Option 2: Render
- ✅ Free tier available
- ✅ Supports full Node.js apps
- ✅ Easy setup

**Render Deployment**:
1. Go to https://render.com
2. Sign up
3. Click "New" → "Web Service"
4. Connect GitHub repo
5. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Add environment variables
7. Deploy!

#### Option 3: Azure App Service
- ✅ Best integration with Microsoft services (you're using SharePoint/Azure AD)
- ✅ Scalable
- 💰 Paid (but has free tier)

## 🔒 Security Checklist

✅ `.env` file is in `.gitignore`
✅ `config.js` uses `process.env` variables
✅ Environment variables set in hosting platform
✅ No secrets in code committed to Git

## 🛠️ Troubleshooting

### Issue: "Cannot find module 'dotenv'"
**Solution**: Make sure `dotenv` is in `dependencies` (not `devDependencies`) in `package.json`

### Issue: Environment variables not working
**Solution**: 
1. Check they're set correctly in Vercel/hosting platform
2. Redeploy after adding/changing variables
3. Check variable names match exactly (case-sensitive)

### Issue: File uploads failing
**Solution**: Consider using Railway or Render instead of Vercel for better file upload support

### Issue: CORS errors
**Solution**: Already handled in `server.js` with CORS headers

## 📞 Support

If you encounter issues:
1. Check Vercel/Railway/Render deployment logs
2. Check browser console for errors
3. Test locally first: `npm start`

## 🎉 You're Ready!

Your application is now secure and ready to deploy. Choose the hosting platform that best fits your needs.
