This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Create the following tables in your Supabase database:

### Players Table

```sql
create table public.players (
id uuid primary key default uuid_generate_v4(),
name text not null,
score integer default 0,
hasPlayed boolean default false,
);
```

### Game States Table

```sql
create table public.games (
room_id text primary key,
isGameActive boolean default false,
isPaused boolean default true,
isGameOver boolean default false,
currentDrawer references public.players(id),
nextDrawer uuid references public.players(id),
playedRounds integer default 0,
timeLeft integer,
currentRoundDuration integer default 60
);
```

### Drawing Table

```sql
create table public.drawings (
room_id text primary key,
drawing_data jsonb,
created_at timestamptz default now()
);
```

3. Set up the following RLS (Row Level Security) policies:

```sql
-- Enable read access for all
create policy "Enable read access for all"
on public.players for select
to public
using (true);

-- Enable insert for all
create policy "Enable insert for all"
on public.players for insert
to public
with check (true);

-- Enable update for all
create policy "Enable update for all"
on public.players for update
to public
using (true);
```

```sql
-- Enable read access for all
create policy "Enable read access for all"
on public.games for select
to public
using (true);

-- Enable insert for all
create policy "Enable insert for all"
on public.games for insert
to public
with check (true);

-- Enable update for all
create policy "Enable update for all"
on public.games for update
to public
using (true);
```

```sql
-- Enable read access for all
create policy "Enable read access for all"
on public.drawings for select
to public
using (true);

-- Enable insert for all
create policy "Enable insert for all"
on public.drawings for insert
to public
with check (true);

-- Enable update for all
create policy "Enable update for all"
on public.drawings for update
to public
using (true);
```

1. Create a `.env.local` file in your project root with your Supabase credentials:

**NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url**

**NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key**

5. Enable Realtime functionality in your Supabase dashboard:
   - Go to Database → Pubblications
   - Enable "Realtime" for `drawings`, `players` and `game_states` tables
