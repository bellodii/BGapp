-- ============================================================
-- 011 · Módulo Maquinarias
-- Seguro de re-ejecutar (idempotente).
-- ============================================================

-- 1) Tablas -------------------------------------------------
create table if not exists public.maquinarias (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null default 'otro',
  marca            text not null,
  modelo           text not null,
  identificador    text,                       -- patente / n° de serie / interno
  anio             int check (anio is null or anio between 1950 and 2100),
  horas_iniciales  numeric(10,1) not null default 0 check (horas_iniciales >= 0),
  horas_por_dia    numeric(4,1)  not null default 8 check (horas_por_dia >= 0 and horas_por_dia <= 24),
  dias_por_semana  numeric(2,1)  not null default 5 check (dias_por_semana >= 0 and dias_por_semana <= 7),
  intervalo_horas  numeric(8,1)  not null default 250 check (intervalo_horas > 0),
  intervalo_meses  int           check (intervalo_meses is null or intervalo_meses > 0) default 6,
  activa           boolean not null default true,
  notas            text,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.maquinaria_horas (
  id            uuid primary key default gen_random_uuid(),
  maquinaria_id uuid not null references public.maquinarias(id) on delete cascade,
  fecha         date not null,
  horas         numeric(4,1) not null check (horas > 0 and horas <= 24),
  observaciones text,
  registrado_por uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  unique (maquinaria_id, fecha)
);

create table if not exists public.maquinaria_services (
  id            uuid primary key default gen_random_uuid(),
  maquinaria_id uuid not null references public.maquinarias(id) on delete cascade,
  fecha         date not null,
  horometro     numeric(10,1) not null check (horometro >= 0),
  descripcion   text,
  registrado_por uuid default auth.uid(),
  created_at    timestamptz not null default now()
);

create index if not exists idx_maq_horas_maq_fecha on public.maquinaria_horas (maquinaria_id, fecha desc);
create index if not exists idx_maq_services_maq on public.maquinaria_services (maquinaria_id, horometro desc);

create or replace function public.maquinarias_set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_maquinarias_updated on public.maquinarias;
create trigger trg_maquinarias_updated before update on public.maquinarias
  for each row execute function public.maquinarias_set_updated_at();

-- 2) Permiso del módulo (enum o CHECK, lo que tenga permisos_admin.modulo)
do $$
declare
  v_udt text; v_con record; v_def text;
begin
  select udt_name into v_udt from information_schema.columns
   where table_schema='public' and table_name='permisos_admin' and column_name='modulo';

  if v_udt is null then
    raise notice 'No existe permisos_admin.modulo: se omite este paso.';
  elsif v_udt <> 'text' and v_udt <> 'varchar' then
    -- tipo enum
    execute format('alter type public.%I add value if not exists %L', v_udt, 'maquinarias');
  else
    -- columna de texto: puede tener un CHECK con la lista de módulos
    for v_con in
      select conname, pg_get_constraintdef(oid) as def from pg_constraint
       where conrelid = 'public.permisos_admin'::regclass and contype = 'c'
         and pg_get_constraintdef(oid) ilike '%modulo%' and pg_get_constraintdef(oid) ilike '%auditoria%'
    loop
      if v_con.def not ilike '%maquinarias%' then
        v_def := replace(v_con.def, '''auditoria''', '''auditoria'', ''maquinarias''');
        execute format('alter table public.permisos_admin drop constraint %I', v_con.conname);
        execute format('alter table public.permisos_admin add constraint %I %s', v_con.conname, v_def);
      end if;
    end loop;
  end if;
exception when others then
  raise notice 'No se pudo registrar el módulo en permisos_admin: %. Pasame este mensaje.', sqlerrm;
end $$;

-- 3) Función de permisos (super admin activo, o fila en permisos_admin)
create or replace function public.maq_permiso(p_accion text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles pr
     where pr.id = auth.uid() and pr.activo
       and (
         pr.rol::text = 'super_admin'
         or exists (
           select 1 from public.permisos_admin pa
            where pa.profile_id = pr.id and pa.modulo::text = 'maquinarias'
              and case p_accion
                    when 'ver'      then pa.puede_ver
                    when 'crear'    then pa.puede_crear
                    when 'editar'   then pa.puede_editar
                    when 'eliminar' then pa.puede_eliminar
                    else false end
         )
       )
  );
$$;
grant execute on function public.maq_permiso(text) to authenticated;

-- 4) RLS ----------------------------------------------------
alter table public.maquinarias         enable row level security;
alter table public.maquinaria_horas    enable row level security;
alter table public.maquinaria_services enable row level security;

drop policy if exists maq_sel on public.maquinarias;
drop policy if exists maq_ins on public.maquinarias;
drop policy if exists maq_upd on public.maquinarias;
drop policy if exists maq_del on public.maquinarias;
create policy maq_sel on public.maquinarias for select to authenticated using (public.maq_permiso('ver'));
create policy maq_ins on public.maquinarias for insert to authenticated with check (public.maq_permiso('crear'));
create policy maq_upd on public.maquinarias for update to authenticated using (public.maq_permiso('editar')) with check (public.maq_permiso('editar'));
create policy maq_del on public.maquinarias for delete to authenticated using (public.maq_permiso('eliminar'));

drop policy if exists maqh_sel on public.maquinaria_horas;
drop policy if exists maqh_ins on public.maquinaria_horas;
drop policy if exists maqh_upd on public.maquinaria_horas;
drop policy if exists maqh_del on public.maquinaria_horas;
create policy maqh_sel on public.maquinaria_horas for select to authenticated using (public.maq_permiso('ver'));
create policy maqh_ins on public.maquinaria_horas for insert to authenticated with check (public.maq_permiso('editar'));
create policy maqh_upd on public.maquinaria_horas for update to authenticated using (public.maq_permiso('editar')) with check (public.maq_permiso('editar'));
create policy maqh_del on public.maquinaria_horas for delete to authenticated using (public.maq_permiso('editar'));

drop policy if exists maqs_sel on public.maquinaria_services;
drop policy if exists maqs_ins on public.maquinaria_services;
drop policy if exists maqs_upd on public.maquinaria_services;
drop policy if exists maqs_del on public.maquinaria_services;
create policy maqs_sel on public.maquinaria_services for select to authenticated using (public.maq_permiso('ver'));
create policy maqs_ins on public.maquinaria_services for insert to authenticated with check (public.maq_permiso('editar'));
create policy maqs_upd on public.maquinaria_services for update to authenticated using (public.maq_permiso('editar')) with check (public.maq_permiso('editar'));
create policy maqs_del on public.maquinaria_services for delete to authenticated using (public.maq_permiso('editar'));

grant select, insert, update, delete on public.maquinarias, public.maquinaria_horas, public.maquinaria_services to authenticated;

-- 5) Vista resumen (respeta RLS del usuario que consulta)
drop view if exists public.vista_maquinarias_resumen;
create view public.vista_maquinarias_resumen with (security_invoker = true) as
select
  m.*,
  coalesce(h.total, 0)::numeric  as horas_registradas,
  coalesce(h.d7, 0)::numeric     as horas_7d,
  coalesce(h.d30, 0)::numeric    as horas_30d,
  s.fecha                        as ultimo_service_fecha,
  s.horometro                    as ultimo_service_horometro,
  s.descripcion                  as ultimo_service_descripcion
from public.maquinarias m
left join lateral (
  select sum(horas) as total,
         sum(horas) filter (where fecha >  (now() at time zone 'America/Argentina/Buenos_Aires')::date - 7)  as d7,
         sum(horas) filter (where fecha >  (now() at time zone 'America/Argentina/Buenos_Aires')::date - 30) as d30
    from public.maquinaria_horas where maquinaria_id = m.id
) h on true
left join lateral (
  select fecha, horometro, descripcion from public.maquinaria_services
   where maquinaria_id = m.id order by horometro desc, fecha desc limit 1
) s on true;

grant select on public.vista_maquinarias_resumen to authenticated;
