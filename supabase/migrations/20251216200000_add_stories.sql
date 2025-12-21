-- Create stories table
create table if not exists public.stories (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    intro_text text,
    cover_image_path text,
    status text default 'draft' check (status in ('draft', 'published')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on stories
alter table public.stories enable row level security;

-- Create policies for stories
create policy "Public stories are viewable by everyone"
    on public.stories for select
    using (true);

create policy "Users can insert their own stories"
    on public.stories for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own stories"
    on public.stories for update
    using (auth.uid() = user_id);

create policy "Users can delete their own stories"
    on public.stories for delete
    using (auth.uid() = user_id);

-- Create story_moments join table
create table if not exists public.story_moments (
    story_id uuid references public.stories(id) on delete cascade not null,
    moment_id uuid references public.moments(id) on delete cascade not null,
    "order" integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (story_id, moment_id)
);

-- Enable RLS on story_moments
alter table public.story_moments enable row level security;

-- Create policies for story_moments
create policy "Public story_moments are viewable by everyone"
    on public.story_moments for select
    using (true);

create policy "Users can insert story_moments for their stories"
    on public.story_moments for insert
    with check (
        exists (
            select 1 from public.stories
            where id = story_id
            and user_id = auth.uid()
        )
    );

create policy "Users can delete story_moments for their stories"
    on public.story_moments for delete
    using (
        exists (
            select 1 from public.stories
            where id = story_id
            and user_id = auth.uid()
        )
    );

-- Add indexes
create index if not exists stories_user_id_idx on public.stories(user_id);
create index if not exists story_moments_story_id_idx on public.story_moments(story_id);
create index if not exists story_moments_moment_id_idx on public.story_moments(moment_id);
