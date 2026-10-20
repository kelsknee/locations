# Site Pin Logger

Log brush, trash and tire piles at your exact GPS location, with photos and drive routes.
Everything is saved to a shared database, so it doesn't matter whose phone logged a pin.

- `index.html` is the logger. Open it on a phone in the field.
- `pins.html` is the data page. It shows every pin, photo and route from everyone, with CSV, photo ZIP and GPX export.

## One-time setup (about 10 minutes, free)

1. Go to https://supabase.com, sign up, and click **New project**. Pick any name and a database password, then wait about a minute for it to finish.
2. In the project, open **SQL Editor > New query**, paste all of `setup.sql`, and click **Run**. It should say "Success".
3. Open **Project Settings > API**. Copy the **Project URL** and the **anon** key (labelled "anon public", or "publishable" in newer projects).
4. Put them in `config.js`:

   ```js
   window.SITE_CONFIG = {
     supabaseUrl: "https://YOUR-PROJECT.supabase.co",
     supabaseKey: "YOUR-ANON-OR-PUBLISHABLE-KEY"
   };
   ```
5. Commit and push. The site updates in about a minute.

The anon key is meant to be public. What it can do is limited by `setup.sql`.

## How it behaves

- A pin is saved to the shared database as soon as it's logged. With no signal it waits on the phone, shows "waiting to upload", and uploads by itself when the signal returns.
- Pins already logged on a phone by earlier versions are moved to the shared database automatically the first time the new page opens.
- Anyone with the link can see, add, edit and delete pins, so keep the link private.
- Until `config.js` is filled in, the logger still works and keeps pins on the phone only.
- Drive routes are saved to the shared database every minute while recording and when you tap Stop.
- Free Supabase projects pause after a week with no activity. If that happens, open the project in the Supabase dashboard and click **Restore project**. Nothing is lost, and pins logged in the meantime wait on the phone and upload afterward.
