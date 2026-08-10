# ctf-log

A personal, daily CTF learning log. You write it, anyone can view it, only you can edit it.

There's no login system — and it doesn't need one. This is a static site: the page
just renders `data/challenges.json`. The only way to change that file is to push a
commit to the repo, and only you have push access. That's the entire "access control"
model, and it's the same one every static GitHub Pages project uses.

## What's in here

- `index.html`, `style.css`, `app.js` — the public, read-only viewer (deployed via GitHub Pages)
- `data/challenges.json` — every entry lives here, plus the predefined lists of domains and difficulties
- `add_entry.py` — the script you run locally each day to add a new entry

## 1. Push this to GitHub

```bash
cd ctf-log
git init
git add .
git commit -m "init: ctf-log"
git branch -M main
git remote add origin https://github.com/<your-username>/ctf-log.git
git push -u origin main
```

## 2. Turn on GitHub Pages

Repo → **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main`, folder `/root` → Save.
Your site will be live at `https://<your-username>.github.io/ctf-log/` within a minute or two.

## 3. Your daily workflow

After a CTF session (or a day of practice):

```bash
python add_entry.py --commit
```

It will ask for:
- date (defaults to today)
- title
- domain — chosen from the predefined list in `data/challenges.json`
- difficulty — Easy / Medium / Hard
- CTF/platform name (optional)
- one-line summary
- your learnings (multi-line — what you actually figured out)
- tools used (optional)
- writeup link (optional)

Then it appends the entry, commits, and pushes automatically. Drop `--commit` if you'd
rather review the diff and commit manually.

**For the commit to count toward your GitHub contribution graph:**
- commit using the same email that's attached to your GitHub account (`git config user.email`)
- push to the default branch of a repo you own (not a fork)
- the repo can be public or private — both count, as long as it's not a fork

## 4. Editing the predefined lists

`domains` and `difficulties` in `data/challenges.json` are the fixed categories the
site filters by. Edit that array directly if you want to add a domain (e.g. `Hardware`,
`AI/ML`) — no code changes needed, the page reads them dynamically.

## 5. Local preview

Browsers block `fetch()` on files opened directly (`file://`), so preview with a local server:

```bash
python -m http.server 8000
```

then open `http://localhost:8000`.

## Notes

- `add_entry.py` never touches anything outside `data/challenges.json` — the viewer
  page has no write path at all, by design.
- If you ever want real multi-user auth (e.g. a login for collaborators to also submit
  entries), that requires a backend and is a different project — this one is intentionally
  a single-author, git-controlled log.
