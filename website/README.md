# MailX Website

The official product landing page and distribution site for **MailX - AI Email Assistant**.

## 🚀 One-Click Deploy to Vercel

### Option 1: Vercel CLI
```bash
cd website
npm install -g vercel  # If not installed
vercel
```

### Option 2: Vercel Web Dashboard (Recommended)
1. Push your repository to GitHub (`git push origin main`).
2. Open [vercel.com/new](https://vercel.com/new).
3. Import your `MailX-Agent` repository.
4. Set **Root Directory** to `website`.
5. Framework Preset: **Vite**.
6. Build Command: `npm run build` (outputs to `dist`).
7. Click **Deploy**.

## 🛠 Local Development

```bash
cd website
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## 📦 Extension Distribution Asset
The website bundles `public/mailx-extension.zip`, which contains the pre-compiled production build of the MailX Chrome Extension connected to your live cloud backend.
