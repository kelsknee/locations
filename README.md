# Site Pin Logger

Log brush, trash and tire piles at your exact GPS location, with photos and drive routes.
Everything is saved to a shared database, so it doesn't matter whose phone logged a pin.

- `index.html` is the logger. Open it on a phone in the field.
- `runs.html` lists every project (run). Open one's data, log into it, rename it, or delete it.
- `pins.html?project=ID` is the data page for one project. It shows every pin, photo and route from everyone in that run, with CSV, photo ZIP and GPX export.

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

## Projects (runs)

A project is one run. Every pin and route belongs to one, so you can keep old runs and start a new one on top.

- On the logger, the **Project** button at the top picks which run this phone logs into, or makes a new one.
- The first time a phone opens the logger it joins the newest project. If someone starts a newer one, other phones are asked "Switch or Stay" so nobody keeps logging into an old run by accident.
- **All runs** shows every project with its pin counts and miles. Deleting a project permanently deletes its pins, photos and routes, and asks you to type its name first.
- If you set up an earlier version, re-run `setup.sql` once to add projects. It is safe to run again and does not touch existing pins.

## How it behaves

- A pin is saved to the shared database as soon as it's logged. With no signal it waits on the phone, shows "waiting to upload", and uploads by itself when the signal returns.
- Pins already logged on a phone by earlier versions are moved to the shared database automatically the first time the new page opens.
- Anyone with the link can see, add, edit and delete pins, so keep the link private.
- Until `config.js` is filled in, the logger still works and keeps pins on the phone only.
- Drive routes are saved to the shared database every minute while recording and when you tap Stop.
- Free Supabase projects pause after a week with no activity. If that happens, open the project in the Supabase dashboard and click **Restore project**. Nothing is lost, and pins logged in the meantime wait on the phone and upload afterward.
