# Kanzlei Doehring – Zeiterfassung und Tätigkeitsnachweis

Eine einfache, vollständig lokale Webanwendung zur Erfassung anwaltlicher
Arbeitszeiten je Mandant/Akte mit automatischer Berechnung von Nettobetrag,
Mehrwertsteuer und Bruttobetrag sowie professionellem Tätigkeitsnachweis
(Druck und PDF, DIN A4).

## Starten

Es ist keine Installation nötig.

1. Den Ordner an einen beliebigen Ort kopieren (z. B. Dokumente).
2. Die Datei **`index.html`** doppelt anklicken – sie öffnet sich im Browser
   (empfohlen: Chrome oder Edge).
3. Die Anwendung ist sofort nutzbar. Ein Beispielmandant (PR-2026-001,
   Max Mustermann) ist bereits angelegt und kann gelöscht werden.

Alternativ kann der Ordner unverändert auf einen normalen Webserver gelegt
werden.

## Anmeldung

Die Anwendung ist durch einen persönlichen Zugang geschützt
(E-Mail-Adresse und Passwort). Zugänge werden von der Kanzlei im
Supabase-Dashboard angelegt – siehe `EINRICHTUNG-SUPABASE.md`.

- Die Anmeldung bleibt auf dem Gerät bestehen, bis „Abmelden" gedrückt wird.
- Das Passwort kann in der Anwendung unter „Einstellungen" →
  „Passwort ändern" geändert werden und gilt dann auf allen Geräten.

## Bedienung in Kürze

1. **Mandant auswählen** oder über „Neuen Mandanten anlegen“ erstellen.
2. **Tätigkeit erfassen**: Datum (vorausgefüllt mit heute), Tätigkeitstext,
   dann entweder Beginn und Ende (Minuten werden automatisch berechnet)
   oder die Minuten direkt eintragen. Betrag, MwSt. und Brutto erscheinen
   sofort. Mit „Tätigkeit speichern“ ablegen.
3. **Tätigkeiten**: Tabelle mit Filtern (Mandant, Zeitraum, Monat, Jahr),
   Sortierung nach Datum, Bearbeiten und Löschen je Eintrag.
4. **Zusammenfassung**: Gesamtzeit, Netto, MwSt. und Brutto – immer bezogen
   auf die aktuellen Filter.
5. **Tätigkeitsnachweis**: Im Filter einen Mandanten wählen, dann
   „Tätigkeitsnachweis anzeigen“, „Als PDF speichern“ (im Druckfenster als
   Ziel „Als PDF speichern“ wählen) oder „Drucken“. Der Nachweis enthält
   bewusst **keine Geldbeträge** – er dokumentiert ausschließlich die
   erbrachten Zeiten (keine Rechnung).
6. **Datensicherung**: „Excel-Datei exportieren“ (CSV, in Excel direkt zu
   öffnen), „Datensicherung erstellen“ (JSON) und „Datensicherung
   wiederherstellen“.
7. **Einstellungen** (eingeklappt, unten): Stundensatz (Standard 550,00 €
   netto), Mehrwertsteuersatz (Standard 19 %), Kanzleidaten und Logo.
   Änderungen am Stundensatz gelten für neue Einträge; bestehende Einträge
   können auf Wunsch nach Bestätigung neu berechnet werden.

## Datenspeicherung und Datenschutz

Die Daten werden verschlüsselt übertragen und je Benutzerkonto in einer
europäischen Datenbank gespeichert (Supabase, Serverstandort Frankfurt).
Dadurch kann von allen Geräten und Standorten mit demselben Datenbestand
gearbeitet werden. Es gibt keine Tracking- oder Analysedienste.

- Jeder Zugang sieht ausschließlich die eigenen Daten
  (Zugriffsregeln direkt in der Datenbank).
- Für die Nutzung ist eine Internetverbindung erforderlich.
- Wird auf zwei Geräten gleichzeitig gearbeitet, erkennt die Anwendung
  Überschneidungen und lädt den neuesten Stand nach – mit Hinweis.
- Zusätzlich empfiehlt sich weiterhin gelegentlich „Datensicherung
  erstellen" als unabhängige Sicherungsdatei.

## Dateien

- `index.html` – Oberfläche der Anwendung
- `styles.css` – Gestaltung (inklusive Druckansicht DIN A4)
- `app.js` – Anwendungslogik (Berechnungen, Speicherung, Export)
