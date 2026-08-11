-- Maximum of three starts per student, class, and competition.
create or replace function public.start_game_v2(p_code text, p_class_id uuid, p_first_name text, p_last_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_competition public.competitions;
  v_run_id uuid;
  v_attempt_count integer;
begin
  select * into v_competition from public.competitions where code = upper(trim(p_code));
  if v_competition.id is null then raise exception 'Competition not found'; end if;
  if not v_competition.is_active then raise exception 'Competition is closed'; end if;
  if v_competition.starts_at is not null and now() < v_competition.starts_at then raise exception 'Competition has not started'; end if;
  if v_competition.ends_at is not null and now() > v_competition.ends_at then raise exception 'Competition has ended'; end if;
  if not exists (select 1 from public.classes where id = p_class_id and competition_id = v_competition.id) then raise exception 'Invalid class'; end if;
  if char_length(trim(p_first_name)) not between 1 and 40 or char_length(trim(p_last_name)) not between 1 and 60 then raise exception 'Invalid name'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_competition.id::text || '|' || p_class_id::text || '|' || lower(trim(p_first_name)) || '|' || lower(trim(p_last_name)), 0));
  select count(*) into v_attempt_count from public.game_runs
  where competition_id = v_competition.id and class_id = p_class_id
    and lower(first_name) = lower(trim(p_first_name)) and lower(last_name) = lower(trim(p_last_name));
  if v_attempt_count >= 3 then raise exception 'Ya has utilizado los 3 intentos permitidos en esta competición.'; end if;

  insert into public.game_runs (competition_id, class_id, first_name, last_name)
  values (v_competition.id, p_class_id, initcap(trim(p_first_name)), initcap(trim(p_last_name))) returning id into v_run_id;
  return jsonb_build_object('run_id', v_run_id, 'attempt_number', v_attempt_count + 1, 'attempts_remaining', 2 - v_attempt_count);
end;
$$;

create or replace function public.get_leaderboard_v2(p_code text, p_limit integer default 25)
returns table(rank_position bigint, display_name text, class_name text, class_color text, score integer, duration_seconds integer, mistakes integer, accuracy numeric, attempt_count bigint)
language sql stable security definer set search_path = public as $$
  with all_runs as (
    select r.*, count(*) over (partition by r.competition_id, r.class_id, lower(r.first_name), lower(r.last_name)) as attempt_count
    from public.game_runs r join public.competitions c on c.id = r.competition_id
    where c.code = upper(trim(p_code))
  ), best as (
    select distinct on (lower(first_name), lower(last_name), class_id)
      first_name, last_name, class_id, score, duration_seconds, mistakes, accuracy, attempt_count
    from all_runs where completed_at is not null
    order by lower(first_name), lower(last_name), class_id, score desc, mistakes asc, duration_seconds asc
  ), ranked as (
    select row_number() over (order by b.score desc, b.mistakes asc, b.duration_seconds asc) as rank_position,
      b.first_name || ' ' || left(b.last_name, 1) || '.' as display_name,
      cl.name as class_name, cl.color as class_color,
      b.score, b.duration_seconds, b.mistakes, b.accuracy, b.attempt_count
    from best b join public.classes cl on cl.id = b.class_id
  )
  select * from ranked order by rank_position limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.start_game_v2(text, uuid, text, text) to anon, authenticated;
grant execute on function public.get_leaderboard_v2(text, integer) to anon, authenticated;
