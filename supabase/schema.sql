create table if not exists public.spin_sessions (
    session_id uuid primary key,
    last_spin_at timestamptz not null
);

create table if not exists public.spins (
    spin_id uuid primary key,
    request_id uuid not null,
    session_id uuid not null references public.spin_sessions(session_id),
    wallet text,
    spin_day date not null,
    prize_name text not null,
    prize_type text not null,
    prize_value integer not null check (prize_value > 0),
    prize_slot smallint not null check (prize_slot between 0 and 15),
    spun_at timestamptz not null,
    player_name text,
    player_email text,
    status text not null default 'pending'
        check (status in ('pending', 'claimed')),
    email_status text not null default 'pending'
        check (email_status in ('pending', 'sent', 'failed')),
    email_error text,
    unique (session_id, request_id)
);

create index if not exists spins_session_time_idx
    on public.spins (session_id, spun_at desc);

create index if not exists spins_wallet_day_idx
    on public.spins (wallet, spin_day)
    where wallet is not null;

create unique index if not exists spins_one_claimed_wallet_per_day
    on public.spins (wallet, spin_day)
    where wallet is not null and status = 'claimed';

alter table public.spin_sessions enable row level security;
alter table public.spins enable row level security;

create or replace function public.reserve_spin_session(
    p_session_id uuid,
    p_now timestamptz,
    p_cooldown_seconds integer
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
    reserved_at timestamptz;
begin
    if p_cooldown_seconds < 1 or p_cooldown_seconds > 3600 then
        raise exception 'Invalid cooldown';
    end if;

    insert into public.spin_sessions (session_id, last_spin_at)
    values (p_session_id, p_now)
    on conflict (session_id) do update
        set last_spin_at = excluded.last_spin_at
        where public.spin_sessions.last_spin_at
            <= p_now - make_interval(secs => p_cooldown_seconds)
    returning last_spin_at into reserved_at;

    return reserved_at;
end;
$$;

revoke all on function public.reserve_spin_session(uuid, timestamptz, integer)
    from public, anon, authenticated;
grant execute on function public.reserve_spin_session(uuid, timestamptz, integer)
    to service_role;

revoke all on public.spin_sessions from anon, authenticated;
revoke all on public.spins from anon, authenticated;
grant all on public.spin_sessions to service_role;
grant all on public.spins to service_role;
