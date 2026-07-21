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

## Passwort

Die Anwendung ist mit einem Passwort geschützt.

- **Standardpasswort beim ersten Start: `Doehring2026`**
- Bitte das Passwort nach der ersten Anmeldung unten im Bereich
  „Einstellungen“ unter „Passwort ändern“ ändern.
- Die Anmeldung gilt für die laufende Browser-Sitzung; nach dem Schließen
  des Browsers wird das Passwort erneut abgefragt.

Hinweis: Der Passwortschutz verhindert den zufälligen Zugriff auf die
Oberfläche. Die Mandantendaten selbst liegen ausschließlich lokal im
Browser des jeweiligen Geräts – sie werden nicht ins Internet übertragen,
auch wenn die Anwendung über eine Internetadresse aufgerufen wird.

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

Alle Daten werden ausschließlich lokal im Browser dieses Geräts gespeichert
(localStorage). Es werden keine Daten an externe Dienste übertragen; es gibt
keine Tracking- oder Analysedienste.

**Wichtig:** Die Daten sind an den verwendeten Browser auf diesem Gerät
gebunden. Bitte regelmäßig über „Datensicherung erstellen“ eine
Sicherungsdatei speichern.

## Dateien

- `index.html` – Oberfläche der Anwendung
- `styles.css` – Gestaltung (inklusive Druckansicht DIN A4)
- `app.js` – Anwendungslogik (Berechnungen, Speicherung, Export)
