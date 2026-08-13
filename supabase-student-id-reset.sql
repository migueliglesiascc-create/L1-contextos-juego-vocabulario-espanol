alter table public.game_runs add column if not exists student_id text;
create index if not exists game_runs_student_lookup_idx
  on public.game_runs (competition_id, class_id, student_id);

create or replace function public.start_game_v3(
  p_code text, p_class_id uuid, p_student_id text, p_first_name text, p_last_name text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_competition public.competitions;
  v_run_id uuid;
  v_attempt_count integer;
  v_student_id text := upper(trim(p_student_id));
begin
  select * into v_competition from public.competitions where code = upper(trim(p_code));
  if v_competition.id is null then raise exception 'Competition not found'; end if;
  if not v_competition.is_active then raise exception 'Competition is closed'; end if;
  if v_competition.starts_at is not null and now() < v_competition.starts_at then raise exception 'Competition has not started'; end if;
  if v_competition.ends_at is not null and now() > v_competition.ends_at then raise exception 'Competition has ended'; end if;
  if not exists (select 1 from public.classes where id = p_class_id and competition_id = v_competition.id) then raise exception 'Invalid class'; end if;
  if v_student_id !~ '^[A-Z0-9-]{3,24}$' then raise exception 'El ID debe tener entre 3 y 24 letras, números o guiones.'; end if;
  if char_length(trim(p_first_name)) not between 1 and 40 or char_length(trim(p_last_name)) not between 1 and 60 then raise exception 'Invalid name'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_competition.id::text || '|' || p_class_id::text || '|' || v_student_id, 0));
  select count(*) into v_attempt_count from public.game_runs
  where competition_id = v_competition.id and class_id = p_class_id and student_id = v_student_id;
  if v_attempt_count >= 3 then raise exception 'Ya has utilizado los 3 intentos permitidos en esta competición.'; end if;

  insert into public.game_runs (competition_id, class_id, student_id, first_name, last_name)
  values (v_competition.id, p_class_id, v_student_id, initcap(trim(p_first_name)), initcap(trim(p_last_name)))
  returning id into v_run_id;
  return jsonb_build_object('run_id', v_run_id, 'attempt_number', v_attempt_count + 1, 'attempts_remaining', 2 - v_attempt_count);
end;
$$;

create or replace function public.get_leaderboard_v2(p_code text, p_limit integer default 25)
returns table(rank_position bigint, display_name text, class_name text, class_color text, score integer, duration_seconds integer, mistakes integer, accuracy numeric, attempt_count bigint)
language sql stable security definer set search_path = public as $$
  with all_runs as (
    select r.*, coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name)) as student_key,
      count(*) over (partition by r.competition_id, r.class_id, coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name))) as attempt_count
    from public.game_runs r join public.competitions c on c.id = r.competition_id
    where c.code = upper(trim(p_code))
  ), best as (
    select distinct on (student_key, class_id)
      first_name, last_name, class_id, score, duration_seconds, mistakes, accuracy, attempt_count
    from all_runs where completed_at is not null
    order by student_key, class_id, score desc, mistakes asc, duration_seconds asc
  ), ranked as (
    select row_number() over (order by b.score desc, b.mistakes asc, b.duration_seconds asc) as rank_position,
      b.first_name || ' ' || left(b.last_name, 1) || '.' as display_name,
      cl.name as class_name, cl.color as class_color,
      b.score, b.duration_seconds, b.mistakes, b.accuracy, b.attempt_count
    from best b join public.classes cl on cl.id = b.class_id
  )
  select * from ranked order by rank_position limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.admin_get_leaderboard_v2(p_code text, p_limit integer default 100)
returns table(rank_position bigint, display_name text, class_id uuid, class_name text, class_color text, score integer, duration_seconds integer, mistakes integer, accuracy numeric, attempt_count bigint, masked_student_id text, student_ref text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_teacher() then raise exception 'Not authorized'; end if;
  return query
  with all_runs as (
    select r.*, coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name)) as student_key,
      count(*) over (partition by r.competition_id, r.class_id, coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name))) as attempt_total
    from public.game_runs r join public.competitions c on c.id = r.competition_id
    where c.code = upper(trim(p_code))
  ), best as (
    select distinct on (a.student_key, a.class_id)
      a.first_name, a.last_name, a.class_id, a.student_id, a.student_key, a.score, a.duration_seconds, a.mistakes, a.accuracy, a.attempt_total
    from all_runs a where a.completed_at is not null
    order by a.student_key, a.class_id, a.score desc, a.mistakes asc, a.duration_seconds asc
  ), ranked as (
    select row_number() over (order by b.score desc, b.mistakes asc, b.duration_seconds asc) as position,
      b.first_name || ' ' || left(b.last_name, 1) || '.' as shown_name,
      b.class_id, cl.name, cl.color, b.score, b.duration_seconds, b.mistakes, b.accuracy, b.attempt_total,
      case when b.student_id is null then 'Anterior' else repeat('•', greatest(length(b.student_id) - 3, 3)) || right(b.student_id, 3) end as masked_id,
      md5(b.student_key) as reset_ref
    from best b join public.classes cl on cl.id = b.class_id
  )
  select position, shown_name, ranked.class_id, name, color, ranked.score, ranked.duration_seconds,
    ranked.mistakes, ranked.accuracy, attempt_total, masked_id, reset_ref
  from ranked order by position limit least(greatest(p_limit, 1), 200);
end;
$$;

create or replace function public.get_class_standings(p_code text)
returns table(rank_position bigint, class_name text, class_color text, team_score numeric, qualifying_students bigint)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name)), r.class_id)
      r.class_id, r.score
    from public.game_runs r join public.competitions c on c.id = r.competition_id
    where c.code = upper(trim(p_code)) and r.completed_at is not null
    order by coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name)), r.class_id, r.score desc
  ), top_three as (
    select b.*, row_number() over (partition by b.class_id order by b.score desc) as rn from best b
  ), totals as (
    select cl.name, cl.color, round(avg(t.score), 0) as team_score, count(t.score) as qualifying_students
    from public.classes cl join public.competitions c on c.id = cl.competition_id
    left join top_three t on t.class_id = cl.id and t.rn <= 3
    where c.code = upper(trim(p_code)) group by cl.id, cl.name, cl.color
  )
  select row_number() over (order by totals.team_score desc nulls last), totals.name, totals.color, totals.team_score, totals.qualifying_students
  from totals order by 1;
$$;

create or replace function public.get_class_podiums(p_code text)
returns table(class_name text, class_color text, class_position bigint, display_name text, score integer, duration_seconds integer, mistakes integer)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name)), r.class_id)
      r.first_name, r.last_name, r.class_id, r.score, r.duration_seconds, r.mistakes
    from public.game_runs r join public.competitions c on c.id = r.competition_id
    where c.code = upper(trim(p_code)) and r.completed_at is not null
    order by coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name)), r.class_id,
      r.score desc, r.mistakes asc, r.duration_seconds asc
  ), ranked as (
    select cl.name as class_name, cl.color as class_color,
      row_number() over (partition by b.class_id order by b.score desc, b.mistakes asc, b.duration_seconds asc) as class_position,
      b.first_name || ' ' || left(b.last_name, 1) || '.' as display_name, b.score, b.duration_seconds, b.mistakes
    from best b join public.classes cl on cl.id = b.class_id
  )
  select * from ranked where class_position <= 3 order by class_name, class_position;
$$;

create or replace function public.admin_reset_student_attempts(p_code text, p_class_id uuid, p_student_ref text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_deleted integer;
begin
  if not public.is_teacher() then raise exception 'Not authorized'; end if;
  delete from public.game_runs r using public.competitions c
  where r.competition_id = c.id and c.code = upper(trim(p_code)) and r.class_id = p_class_id
    and md5(coalesce(nullif(r.student_id, ''), lower(r.first_name) || '|' || lower(r.last_name))) = p_student_ref;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.start_game_v3(text, uuid, text, text, text) to anon, authenticated;
revoke all on function public.admin_get_leaderboard_v2(text, integer) from public, anon;
revoke all on function public.admin_reset_student_attempts(text, uuid, text) from public, anon;
grant execute on function public.admin_get_leaderboard_v2(text, integer) to authenticated;
grant execute on function public.admin_reset_student_attempts(text, uuid, text) to authenticated;
