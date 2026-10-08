# Putting Rock 'n' Roll Zombies online

Two parts: **GitHub Pages** hosts the game (free), and **Supabase** stores the world scoreboard (free).

---

## 1. Publish the game with GitHub Desktop

1. Open **GitHub Desktop** → *File* → *Add local repository…* → choose the `RockNRollZombies` folder on your Desktop.
2. Click **Publish repository**. Name it `rock-n-roll-zombies`. **Untick "Keep this code private"** (GitHub Pages needs a public repo on a free account). Click *Publish*.
3. On github.com, open the repository → **Settings** → **Pages**.
   Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**, then **Save**.
4. After a minute the game is live at `https://YOUR-USERNAME.github.io/rock-n-roll-zombies/`.

Whenever the game changes: open GitHub Desktop, write a short summary, click **Commit to main**, then **Push origin**. The site updates a minute later.

### Optional: use rocknrollzombies.com

1. In the repo's **Settings → Pages → Custom domain**, type `rocknrollzombies.com` and save. Tick **Enforce HTTPS** once it's offered.
2. In **GoDaddy → DNS** for rocknrollzombies.com, add:

   | Type | Name | Value |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | YOUR-USERNAME.github.io |

   Delete any existing **A** record for `@` that points somewhere else (GoDaddy's "Parked" one).
3. DNS can take up to an hour.

---

## 2. The world scoreboard (Supabase)

1. Make a free account at **supabase.com** and create a **New project** (any name, e.g. `rnrz`; pick the region closest to you; save the database password somewhere safe; you won't need it for the game).
2. In the project, open **SQL Editor**, paste everything below, and click **Run**:

```sql
create table public.scores (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('score', 'speed')),
  name text not null check (name ~ '^[A-Z0-9 ]{1,3}$'),
  score integer not null default 0 check (score between 0 and 5000000),
  time_s numeric(8,2) check (time_s is null or time_s between 20 and 7200),
  level smallint not null check (level between 1 and 20),
  diff text not null check (diff in ('easy', 'normal', 'hard')),
  hero text check (char_length(hero) <= 20),
  created_at timestamptz not null default now(),
  check ((kind = 'speed') = (time_s is not null))
);

alter table public.scores enable row level security;

-- Anyone can read the board and add a score. Nobody can edit or delete through the game.
create policy "anyone can read scores" on public.scores for select to anon using (true);
create policy "anyone can add a score" on public.scores for insert to anon with check (true);

create index on public.scores (kind, score desc);
create index on public.scores (kind, level, time_s);
```

3. Open **Project Settings → API** (or **Data API**). Copy the **Project URL** and the **anon public** key.
4. Send those two to Claude, or paste them into `js/online.js`:

```js
export const SCOREBOARD = {
  url: 'https://xxxx.supabase.co',
  key: 'eyJhbGciOi...',
};
```

then run `python build.py` and push with GitHub Desktop.

**To remove a silly or rude entry:** Supabase → *Table Editor* → `scores` → select the row → delete.

**Honest limits:** this is a fun arcade board, not a cheat-proof one. Someone determined could send a fake score. The rules above stop nonsense values (impossible scores, long names, sub-20-second clears), and you can delete anything that slips through.
