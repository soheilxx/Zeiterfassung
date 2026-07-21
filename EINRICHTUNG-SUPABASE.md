# Einmalige Einrichtung der Datenbank (Supabase)

Diese Schritte sind nur **einmal** nötig. Danach funktioniert die
Anwendung auf allen Geräten mit demselben Zugang.

## Schritt 1: Datenbanktabelle anlegen

1. Im Supabase-Dashboard links **SQL Editor** öffnen.
2. Den folgenden Text vollständig einfügen und auf **Run** klicken:

```sql
-- Tabelle: ein Datenbestand je Benutzerkonto
create table if not exists public.speicher (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  daten jsonb not null,
  version bigint not null default 1,
  aktualisiert_am timestamptz not null default now()
);

-- Zugriffsschutz: jeder Benutzer sieht und ändert nur die eigenen Daten
alter table public.speicher enable row level security;

create policy "Eigene Daten lesen"
  on public.speicher for select
  using (auth.uid() = user_id);

create policy "Eigene Daten anlegen"
  on public.speicher for insert
  with check (auth.uid() = user_id);

create policy "Eigene Daten aendern"
  on public.speicher for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Eigene Daten loeschen"
  on public.speicher for delete
  using (auth.uid() = user_id);
```

Unten sollte „Success. No rows returned" erscheinen.

## Schritt 2: Benutzerzugang anlegen

1. Links **Authentication** → **Users** öffnen.
2. Oben rechts **Add user** → **Create new user**.
3. E-Mail-Adresse und ein Passwort eintragen.
4. **„Auto Confirm User" aktivieren** (wichtig – sonst wartet der Zugang
   auf eine Bestätigungs-E-Mail).
5. Speichern.

Mit dieser E-Mail-Adresse und diesem Passwort melden Sie sich künftig
in der Anwendung an – auf jedem Gerät.

## Schritt 3 (empfohlen): Selbstregistrierung abschalten

Damit sich niemand Fremdes ein Konto anlegen kann:

1. **Authentication** → **Sign In / Providers** öffnen.
2. Beim Punkt **Email** die Option **„Allow new users to sign up"
   deaktivieren** und speichern.

Neue Zugänge (z. B. für eine Kollegin oder einen Kollegen) legen Sie
dann wie in Schritt 2 selbst im Dashboard an. Jeder Zugang hat seinen
eigenen, getrennten Datenbestand.
