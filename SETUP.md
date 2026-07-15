# MailX Teammate Setup

Use this guide to run MailX locally. Do not commit API keys, OAuth client secrets, or Supabase service-role keys.

## Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- Google Chrome or Chromium
- A Gmail account permitted by the Google OAuth consent screen
- A Zen API key or DeepSeek API key

## 1. Clone and Select the Branch

```powershell
git clone https://github.com/Sadik-Shahriar/MailX-Agent.git
cd MailX-Agent
git switch oishik
```

## 2. Configure the Backend

Install Python dependencies:

```powershell
cd backend
python -m pip install -r requirements.txt
```

Create `backend/.env` manually. Use one provider key only:

```env
ZEN_API_KEY=your_zen_api_key
```

Or:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
```

The default Zen model is `mimo-v2.5-free`, selected for quick email responses. To use another compatible Zen model, optionally add:

```env
ZEN_MODEL=your_model_id
```

Start the backend and keep this terminal open while using the extension:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8001
```

Confirm it is running by opening `http://localhost:8001/health`. It should return `{"status":"ok"}`.

## 3. Build the Extension

Open a second PowerShell terminal:

```powershell
cd path\to\MailX-Agent\extension
npm install
npm run build
```

## 4. Load the Extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `MailX-Agent\extension\dist`.
5. Copy the MailX Extension ID shown by Chrome.
6. After source changes, click the extension reload icon and refresh Gmail.

## 5. Supabase Database Setup

This requires a Supabase project owner or admin.

1. Open the Supabase project SQL Editor.
2. Run the full contents of `supabase/schema.sql`.
3. Verify that the `preferences`, `sender_scores`, `tasks`, `reminders`, and `email_activity` tables exist.

The extension already contains the project URL and public anonymous key. Never place a Supabase `service_role` key in the extension.

## 6. Google OAuth and Gmail Setup

This requires both a Supabase owner/admin and Google Cloud OAuth access.

### Google Cloud

1. Create or select a Google Cloud project.
2. Configure **OAuth consent screen** as External.
3. Add allowed team Gmail accounts under **Test users** while the app is in testing.
4. Enable **Gmail API** in APIs and Services Library.
5. Create an OAuth Client ID with application type **Web application**.
6. Add this authorized redirect URI:

```text
https://akespqwzlrsajibjheqg.supabase.co/auth/v1/callback
```

### Supabase

1. Go to **Authentication -> Providers -> Google**.
2. Enable Google provider.
3. Enter the Google OAuth Client ID and Client Secret.
4. Save the provider settings.
5. Go to **Authentication -> URL Configuration**.
6. Add this redirect URL, replacing the placeholder with the Chrome Extension ID from step 4:

```text
https://YOUR_EXTENSION_ID.chromiumapp.org/
```

## 7. Sign In and Test

1. Open Gmail and refresh the page.
2. Click the MailX extension icon.
3. Choose **Sign in with Google** and grant the requested Gmail permissions.
4. Open an email to use Summarize, Smart Reply, Priority, and Tasks.
5. Use Draft from any Gmail view.

## Common Problems

| Problem | Fix |
|---|---|
| `Failed to fetch` | Start the backend on port `8001` and keep its terminal open. |
| `No API key configured` | Check `backend/.env`, then restart the backend. |
| Google sign-in says provider is not enabled | A Supabase owner must enable Google under Authentication Providers. |
| OAuth redirect error | Add the exact Chrome callback URL to Supabase Auth Redirect URLs. |
| Gmail tools do not update | Reload MailX in `chrome://extensions`, then refresh Gmail. |
| AI action fails after a long delay | Check that the Zen/DeepSeek key is active and retry once. |

## Daily Commands

```powershell
# Backend terminal
cd path\to\MailX-Agent\backend
uvicorn main:app --host 0.0.0.0 --port 8001
```

```powershell
# Rebuild extension after changes
cd path\to\MailX-Agent\extension
npm run build
```
