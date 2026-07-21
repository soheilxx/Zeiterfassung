/* =====================================================================
   Kanzlei Doehring – Zeiterfassung und Tätigkeitsnachweis
   ---------------------------------------------------------------------
   Aufbau dieser Datei:
     1. Datenhaltung (Laden/Speichern im Browser, Beispieldaten)
     2. Berechnungen (Minuten, Netto, MwSt., Brutto) und Formatierung
     3. Mandantenverwaltung (Bereich 1)
     4. Zeiterfassung (Bereich 2)
     5. Tabelle, Filter, Sortierung (Bereich 3) und Summen (Bereich 4)
     6. Tätigkeitsnachweis, Druck und PDF (Bereich 5)
     7. Excel-/CSV-Export, Datensicherung (Bereich 5)
     8. Einstellungen (Bereich 6)
   Alle Daten bleiben ausschließlich lokal im Browser (localStorage).
   ===================================================================== */

'use strict';

/* =====================================================================
   1. Datenhaltung
   ===================================================================== */

const SPEICHER_SCHLUESSEL = 'kanzlei-doehring-zeiterfassung';

// Standardwerte für die Einstellungen
function standardEinstellungen() {
  return {
    stundensatz: 550.00,      // Euro netto pro Stunde
    mwstSatz: 19,             // Prozent
    kanzleiName: 'Kanzlei Doehring',
    kanzleiAnschrift: '',
    kanzleiTelefon: '',
    kanzleiEmail: '',
    logoDatenUrl: ''          // hochgeladenes Logo als Daten-URL
  };
}

// Gesamter Anwendungszustand
let daten = {
  einstellungen: standardEinstellungen(),
  mandanten: [],   // { id, prNr, name, anschrift, ansprechpartner, bemerkung }
  eintraege: []    // { id, mandantId, datum(ISO), taetigkeit, beginn, ende, minuten, stundensatz, mwstSatz }
};

// Zustand der Oberfläche (wird nicht dauerhaft gespeichert, außer dem zuletzt gewählten Mandanten)
let ui = {
  gewaehlterMandantId: '',
  bearbeiteterMandantId: null,  // null = Formular geschlossen, '' = neuer Mandant
  bearbeiteterEintragId: null,
  sortierAbsteigend: true,
  filter: { mandantId: '', von: '', bis: '', monat: '', jahr: '' }
};

function datenSpeichern() {
  localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({
    einstellungen: daten.einstellungen,
    mandanten: daten.mandanten,
    eintraege: daten.eintraege,
    zuletztGewaehlterMandantId: ui.gewaehlterMandantId
  }));
}

function datenLaden() {
  const roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
  if (!roh) {
    beispieldatenAnlegen();
    return;
  }
  try {
    const geladen = JSON.parse(roh);
    daten.einstellungen = Object.assign(standardEinstellungen(), geladen.einstellungen || {});
    daten.mandanten = Array.isArray(geladen.mandanten) ? geladen.mandanten : [];
    daten.eintraege = Array.isArray(geladen.eintraege) ? geladen.eintraege : [];
    ui.gewaehlterMandantId = geladen.zuletztGewaehlterMandantId || '';
  } catch (fehler) {
    // Beschädigte Daten: mit Beispieldaten neu beginnen, ohne technische Meldung
    beispieldatenAnlegen();
  }
}

function neueId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// Beispielmandant und Beispieltätigkeit für den ersten Start
function beispieldatenAnlegen() {
  const mandantId = neueId();
  daten.mandanten = [{
    id: mandantId,
    prNr: 'PR-2026-001',
    name: 'Max Mustermann',
    anschrift: 'Musterstraße 1, 12345 Musterstadt',
    ansprechpartner: '',
    bemerkung: 'Beispielmandant – kann gelöscht werden.'
  }];
  daten.eintraege = [{
    id: neueId(),
    mandantId: mandantId,
    datum: '2026-07-15',
    taetigkeit: 'Prüfung der Vertragsunterlagen und telefonische Abstimmung mit dem Mandanten',
    beginn: '09:00',
    ende: '10:15',
    minuten: 75,
    stundensatz: 550.00,
    mwstSatz: 19
  }];
  ui.gewaehlterMandantId = mandantId;
  datenSpeichern();
}

/* =====================================================================
   2. Berechnungen und Formatierung
   ===================================================================== */

// Rundet kaufmännisch auf 2 Nachkommastellen (Cent-genau)
function rundeCent(betrag) {
  return Math.round((betrag + Number.EPSILON) * 100) / 100;
}

// Berechnet Netto, MwSt. und Brutto aus Minuten, Stundensatz und MwSt.-Satz
function berechneBetraege(minuten, stundensatz, mwstSatz) {
  const netto = rundeCent((minuten / 60) * stundensatz);
  const mwst = rundeCent(netto * (mwstSatz / 100));
  const brutto = rundeCent(netto + mwst);
  return { netto: netto, mwst: mwst, brutto: brutto };
}

// Minuten zwischen zwei Uhrzeiten "HH:MM"; negativ, wenn Ende vor Beginn liegt
function minutenZwischen(beginn, ende) {
  const [bh, bm] = beginn.split(':').map(Number);
  const [eh, em] = ende.split(':').map(Number);
  return (eh * 60 + em) - (bh * 60 + bm);
}

const euroFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function alsEuro(betrag) {
  return euroFormat.format(betrag);
}

function alsProzent(satz) {
  return satz.toLocaleString('de-DE') + ' %';
}

// ISO-Datum "2026-07-15" -> "15.07.2026"
function datumDeutsch(isoDatum) {
  if (!isoDatum) return '';
  const [jahr, monat, tag] = isoDatum.split('-');
  return tag + '.' + monat + '.' + jahr;
}

// Minuten -> "7 Stunden 35 Minuten"
function dauerText(gesamtMinuten) {
  const stunden = Math.floor(gesamtMinuten / 60);
  const minuten = gesamtMinuten % 60;
  if (stunden === 0) return minuten + ' Minuten';
  const stundenWort = stunden === 1 ? 'Stunde' : 'Stunden';
  if (minuten === 0) return stunden + ' ' + stundenWort;
  return stunden + ' ' + stundenWort + ' ' + minuten + ' Minuten';
}

function heuteIso() {
  const jetzt = new Date();
  const monat = String(jetzt.getMonth() + 1).padStart(2, '0');
  const tag = String(jetzt.getDate()).padStart(2, '0');
  return jetzt.getFullYear() + '-' + monat + '-' + tag;
}

// Kurzform für document.getElementById
function el(id) {
  return document.getElementById(id);
}

// Text sicher für HTML aufbereiten
function html(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function mandantVonId(id) {
  return daten.mandanten.find(function (m) { return m.id === id; }) || null;
}

/* =====================================================================
   3. Mandantenverwaltung (Bereich 1)
   ===================================================================== */

// Auswahlliste (mit Suchfilter) und Filterliste neu aufbauen
function mandantenListenAktualisieren() {
  const suche = el('mandant-suche').value.trim().toLowerCase();
  const auswahl = el('mandant-auswahl');
  const filterAuswahl = el('filter-mandant');

  const sortiert = daten.mandanten.slice().sort(function (a, b) {
    return a.name.localeCompare(b.name, 'de');
  });

  // Bereich 1: Auswahl des aktiven Mandanten
  auswahl.innerHTML = '<option value="">– Bitte Mandanten auswählen –</option>';
  sortiert.forEach(function (m) {
    const text = m.prNr + ' – ' + m.name;
    if (suche && !text.toLowerCase().includes(suche)) return;
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = text;
    auswahl.appendChild(option);
  });
  auswahl.value = ui.gewaehlterMandantId;
  if (auswahl.value !== ui.gewaehlterMandantId) auswahl.value = '';

  // Bereich 3: Filter nach Mandant
  filterAuswahl.innerHTML = '<option value="">Alle Mandanten</option>';
  sortiert.forEach(function (m) {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = m.prNr + ' – ' + m.name;
    filterAuswahl.appendChild(option);
  });
  filterAuswahl.value = ui.filter.mandantId;

  erfassungMandantAnzeigen();
}

// Zeigt im Erfassungsbereich, für welchen Mandanten erfasst wird
function erfassungMandantAnzeigen() {
  const anzeige = el('erfassung-mandant-anzeige');
  const mandant = mandantVonId(ui.gewaehlterMandantId);
  if (mandant) {
    anzeige.innerHTML = 'Erfassung für: <strong>' + html(mandant.prNr) + ' – ' + html(mandant.name) + '</strong>' +
      ' (PR-Nr. und Name werden automatisch übernommen)';
  } else {
    anzeige.textContent = 'Bitte wählen Sie zuerst oben einen Mandanten aus.';
  }
}

function mandantFormularOeffnen(mandantId) {
  ui.bearbeiteterMandantId = mandantId; // '' = neu, sonst Bearbeitung
  const mandant = mandantId ? mandantVonId(mandantId) : null;
  el('mandant-formular-titel').textContent = mandant ? 'Mandanten bearbeiten' : 'Neuen Mandanten anlegen';
  el('mandant-prnr').value = mandant ? mandant.prNr : '';
  el('mandant-name').value = mandant ? mandant.name : '';
  el('mandant-anschrift').value = mandant ? (mandant.anschrift || '') : '';
  el('mandant-ansprechpartner').value = mandant ? (mandant.ansprechpartner || '') : '';
  el('mandant-bemerkung').value = mandant ? (mandant.bemerkung || '') : '';
  el('mandant-fehler').hidden = true;
  el('mandant-formular').hidden = false;
  el('mandant-prnr').focus();
}

function mandantFormularSchliessen() {
  ui.bearbeiteterMandantId = null;
  el('mandant-formular').hidden = true;
}

function mandantSpeichern() {
  const prNr = el('mandant-prnr').value.trim();
  const name = el('mandant-name').value.trim();
  const fehlerFeld = el('mandant-fehler');

  if (!prNr || !name) {
    fehlerFeld.textContent = 'Bitte tragen Sie mindestens die PR-Nr. und den Namen des Mandanten ein.';
    fehlerFeld.hidden = false;
    return;
  }

  const werte = {
    prNr: prNr,
    name: name,
    anschrift: el('mandant-anschrift').value.trim(),
    ansprechpartner: el('mandant-ansprechpartner').value.trim(),
    bemerkung: el('mandant-bemerkung').value.trim()
  };

  if (ui.bearbeiteterMandantId) {
    // Bestehenden Mandanten aktualisieren
    const mandant = mandantVonId(ui.bearbeiteterMandantId);
    if (mandant) Object.assign(mandant, werte);
  } else {
    // Neuen Mandanten anlegen und direkt auswählen
    const neuerMandant = Object.assign({ id: neueId() }, werte);
    daten.mandanten.push(neuerMandant);
    ui.gewaehlterMandantId = neuerMandant.id;
  }

  mandantFormularSchliessen();
  datenSpeichern();
  allesAktualisieren();
}

function mandantLoeschen() {
  const mandant = mandantVonId(ui.gewaehlterMandantId);
  if (!mandant) {
    alert('Bitte wählen Sie zuerst einen Mandanten aus.');
    return;
  }
  const anzahl = daten.eintraege.filter(function (e) { return e.mandantId === mandant.id; }).length;
  const frage = 'Möchten Sie den Mandanten „' + mandant.prNr + ' – ' + mandant.name + '“ wirklich löschen?' +
    (anzahl > 0 ? '\n\nAchtung: Dabei werden auch ' + anzahl + ' erfasste Tätigkeit(en) dieses Mandanten gelöscht.' : '');
  if (!confirm(frage)) return;

  daten.mandanten = daten.mandanten.filter(function (m) { return m.id !== mandant.id; });
  daten.eintraege = daten.eintraege.filter(function (e) { return e.mandantId !== mandant.id; });
  if (ui.filter.mandantId === mandant.id) ui.filter.mandantId = '';
  ui.gewaehlterMandantId = '';
  datenSpeichern();
  allesAktualisieren();
}

/* =====================================================================
   4. Zeiterfassung (Bereich 2)
   ===================================================================== */

// Liest die Eingaben und berechnet die Minuten (Beginn/Ende haben Vorrang)
function eingabeAuswerten() {
  const beginn = el('eintrag-beginn').value;
  const ende = el('eintrag-ende').value;
  const minutenFeld = el('eintrag-minuten');

  let minuten = null;
  let fehler = '';

  if (beginn && ende) {
    // Beide Uhrzeiten vorhanden: Minuten werden automatisch berechnet
    const differenz = minutenZwischen(beginn, ende);
    if (differenz <= 0) {
      fehler = 'Bitte überprüfen Sie Beginn und Ende. Die Endzeit muss nach der Startzeit liegen.';
    } else {
      minuten = differenz;
    }
    minutenFeld.value = minuten !== null ? minuten : '';
    minutenFeld.readOnly = true;
    el('minuten-hinweis').hidden = false;
  } else {
    // Manuelle Minuteneingabe möglich
    minutenFeld.readOnly = false;
    el('minuten-hinweis').hidden = true;
    if (minutenFeld.value !== '') {
      const wert = Number(minutenFeld.value);
      if (!Number.isFinite(wert) || wert <= 0 || !Number.isInteger(wert)) {
        fehler = 'Bitte geben Sie die Minuten als positive ganze Zahl ein, zum Beispiel 30.';
      } else {
        minuten = wert;
      }
    }
  }

  return { minuten: minuten, fehler: fehler, beginn: beginn, ende: ende };
}

// Aktualisiert die sofort sichtbare Berechnung unter dem Formular
function liveBerechnungAktualisieren() {
  const auswertung = eingabeAuswerten();
  const fehlerFeld = el('eintrag-fehler');

  if (auswertung.fehler) {
    fehlerFeld.textContent = auswertung.fehler;
    fehlerFeld.hidden = false;
  } else {
    fehlerFeld.hidden = true;
  }

  if (auswertung.minuten !== null && !auswertung.fehler) {
    const betraege = berechneBetraege(auswertung.minuten, daten.einstellungen.stundensatz, daten.einstellungen.mwstSatz);
    el('live-dauer').textContent = auswertung.minuten + ' Minuten (' + dauerText(auswertung.minuten) + ')';
    el('live-netto').textContent = alsEuro(betraege.netto);
    el('live-mwst').textContent = alsEuro(betraege.mwst) + ' (' + alsProzent(daten.einstellungen.mwstSatz) + ')';
    el('live-brutto').textContent = alsEuro(betraege.brutto);
  } else {
    el('live-dauer').textContent = '–';
    el('live-netto').textContent = '–';
    el('live-mwst').textContent = '–';
    el('live-brutto').textContent = '–';
  }
}

// Formular leeren und für den nächsten Eintrag vorbereiten (Mandant bleibt gewählt)
function erfassungZuruecksetzen() {
  ui.bearbeiteterEintragId = null;
  el('eintrag-datum').value = heuteIso();
  el('eintrag-taetigkeit').value = '';
  el('eintrag-beginn').value = '';
  el('eintrag-ende').value = '';
  el('eintrag-minuten').value = '';
  el('eintrag-minuten').readOnly = false;
  el('minuten-hinweis').hidden = true;
  el('eintrag-fehler').hidden = true;
  el('knopf-eintrag-speichern').textContent = 'Tätigkeit speichern';
  el('knopf-eintrag-abbrechen').hidden = true;
  liveBerechnungAktualisieren();
}

function eintragSpeichern() {
  const fehlerFeld = el('eintrag-fehler');
  const mandant = mandantVonId(ui.gewaehlterMandantId);
  const datum = el('eintrag-datum').value;
  const taetigkeit = el('eintrag-taetigkeit').value.trim();
  const auswertung = eingabeAuswerten();

  // Verständliche Plausibilitätsprüfungen
  let fehler = '';
  if (!mandant) {
    fehler = 'Bitte wählen Sie zuerst im Bereich 1 einen Mandanten aus oder legen Sie einen neuen Mandanten an.';
  } else if (!datum) {
    fehler = 'Bitte tragen Sie ein Datum ein.';
  } else if (!taetigkeit) {
    fehler = 'Bitte beschreiben Sie die Tätigkeit, zum Beispiel „Telefonat mit Mandant“.';
  } else if (auswertung.fehler) {
    fehler = auswertung.fehler;
  } else if (auswertung.minuten === null) {
    fehler = 'Bitte tragen Sie entweder Beginn und Ende oder die Anzahl der Minuten ein.';
  }

  if (fehler) {
    fehlerFeld.textContent = fehler;
    fehlerFeld.hidden = false;
    return;
  }
  fehlerFeld.hidden = true;

  if (ui.bearbeiteterEintragId) {
    // Bestehenden Eintrag aktualisieren; der ursprüngliche Stundensatz bleibt erhalten
    const eintrag = daten.eintraege.find(function (e) { return e.id === ui.bearbeiteterEintragId; });
    if (eintrag) {
      eintrag.mandantId = mandant.id;
      eintrag.datum = datum;
      eintrag.taetigkeit = taetigkeit;
      eintrag.beginn = auswertung.beginn && auswertung.ende ? auswertung.beginn : '';
      eintrag.ende = auswertung.beginn && auswertung.ende ? auswertung.ende : '';
      eintrag.minuten = auswertung.minuten;
    }
  } else {
    // Neuer Eintrag mit dem aktuell gültigen Stundensatz und MwSt.-Satz
    daten.eintraege.push({
      id: neueId(),
      mandantId: mandant.id,
      datum: datum,
      taetigkeit: taetigkeit,
      beginn: auswertung.beginn && auswertung.ende ? auswertung.beginn : '',
      ende: auswertung.beginn && auswertung.ende ? auswertung.ende : '',
      minuten: auswertung.minuten,
      stundensatz: daten.einstellungen.stundensatz,
      mwstSatz: daten.einstellungen.mwstSatz
    });
  }

  datenSpeichern();
  erfassungZuruecksetzen();
  allesAktualisieren();
}

function eintragBearbeiten(eintragId) {
  const eintrag = daten.eintraege.find(function (e) { return e.id === eintragId; });
  if (!eintrag) return;

  ui.bearbeiteterEintragId = eintragId;
  ui.gewaehlterMandantId = eintrag.mandantId;
  el('mandant-auswahl').value = eintrag.mandantId;

  el('eintrag-datum').value = eintrag.datum;
  el('eintrag-taetigkeit').value = eintrag.taetigkeit;
  el('eintrag-beginn').value = eintrag.beginn || '';
  el('eintrag-ende').value = eintrag.ende || '';
  el('eintrag-minuten').value = eintrag.minuten;
  el('knopf-eintrag-speichern').textContent = 'Änderungen speichern';
  el('knopf-eintrag-abbrechen').hidden = false;

  erfassungMandantAnzeigen();
  liveBerechnungAktualisieren();
  el('bereich-erfassung').scrollIntoView({ behavior: 'smooth' });
}

function eintragLoeschen(eintragId) {
  if (!confirm('Möchten Sie diesen Tätigkeitseintrag wirklich löschen?')) return;
  daten.eintraege = daten.eintraege.filter(function (e) { return e.id !== eintragId; });
  if (ui.bearbeiteterEintragId === eintragId) erfassungZuruecksetzen();
  datenSpeichern();
  allesAktualisieren();
}

/* =====================================================================
   5. Tabelle, Filter, Sortierung (Bereich 3) und Summen (Bereich 4)
   ===================================================================== */

// Liefert die Einträge, die den aktuellen Filtern entsprechen (sortiert nach Datum)
function gefilterteEintraege() {
  const f = ui.filter;
  const gefiltert = daten.eintraege.filter(function (e) {
    if (f.mandantId && e.mandantId !== f.mandantId) return false;
    if (f.von && e.datum < f.von) return false;
    if (f.bis && e.datum > f.bis) return false;
    if (f.monat && e.datum.slice(0, 7) !== f.monat) return false;
    if (f.jahr && e.datum.slice(0, 4) !== f.jahr) return false;
    return true;
  });

  gefiltert.sort(function (a, b) {
    const vergleich = a.datum.localeCompare(b.datum) || (a.beginn || '').localeCompare(b.beginn || '');
    return ui.sortierAbsteigend ? -vergleich : vergleich;
  });
  return gefiltert;
}

// Monats- und Jahresfilter aus den vorhandenen Einträgen aufbauen
function filterAuswahlenAktualisieren() {
  const monate = new Set();
  const jahre = new Set();
  daten.eintraege.forEach(function (e) {
    monate.add(e.datum.slice(0, 7));
    jahre.add(e.datum.slice(0, 4));
  });

  const monatsNamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const monatAuswahl = el('filter-monat');
  monatAuswahl.innerHTML = '<option value="">Alle Monate</option>';
  Array.from(monate).sort().reverse().forEach(function (m) {
    const option = document.createElement('option');
    option.value = m;
    option.textContent = monatsNamen[Number(m.slice(5, 7)) - 1] + ' ' + m.slice(0, 4);
    monatAuswahl.appendChild(option);
  });
  monatAuswahl.value = ui.filter.monat;

  const jahrAuswahl = el('filter-jahr');
  jahrAuswahl.innerHTML = '<option value="">Alle Jahre</option>';
  Array.from(jahre).sort().reverse().forEach(function (j) {
    const option = document.createElement('option');
    option.value = j;
    option.textContent = j;
    jahrAuswahl.appendChild(option);
  });
  jahrAuswahl.value = ui.filter.jahr;
}

function tabelleAktualisieren() {
  const tbody = el('taetigkeiten-tbody');
  const eintraege = gefilterteEintraege();
  tbody.innerHTML = '';

  el('tabelle-leer-hinweis').hidden = eintraege.length > 0;
  el('sortier-pfeil').textContent = ui.sortierAbsteigend ? '▼' : '▲';

  eintraege.forEach(function (e) {
    const mandant = mandantVonId(e.mandantId);
    const betraege = berechneBetraege(e.minuten, e.stundensatz, e.mwstSatz);
    const zeile = document.createElement('tr');
    zeile.innerHTML =
      '<td>' + html(mandant ? mandant.prNr : '–') + '</td>' +
      '<td>' + html(mandant ? mandant.name : '–') + '</td>' +
      '<td class="zahl">' + datumDeutsch(e.datum) + '</td>' +
      '<td class="spalte-taetigkeit">' + html(e.taetigkeit) + '</td>' +
      '<td class="zahl">' + html(e.beginn || '–') + '</td>' +
      '<td class="zahl">' + html(e.ende || '–') + '</td>' +
      '<td class="zahl">' + e.minuten + '</td>' +
      '<td class="zahl spalte-neben">' + alsEuro(e.stundensatz) + '</td>' +
      '<td class="zahl spalte-betrag">' + alsEuro(betraege.netto) + '</td>' +
      '<td class="zahl spalte-neben">' + alsEuro(betraege.mwst) + '</td>' +
      '<td class="zahl spalte-neben">' + alsEuro(betraege.brutto) + '</td>' +
      '<td><button type="button" class="tabellen-aktion" data-aktion="bearbeiten" data-id="' + e.id + '">Bearbeiten</button></td>' +
      '<td><button type="button" class="tabellen-aktion tabellen-aktion-loeschen" data-aktion="loeschen" data-id="' + e.id + '">Löschen</button></td>';
    tbody.appendChild(zeile);
  });
}

// Summen für eine Liste von Einträgen (je Eintrag gerundet, dann addiert)
function summenBerechnen(eintraege) {
  let minuten = 0, netto = 0, mwst = 0;
  eintraege.forEach(function (e) {
    const betraege = berechneBetraege(e.minuten, e.stundensatz, e.mwstSatz);
    minuten += e.minuten;
    netto = rundeCent(netto + betraege.netto);
    mwst = rundeCent(mwst + betraege.mwst);
  });
  return { minuten: minuten, netto: netto, mwst: mwst, brutto: rundeCent(netto + mwst) };
}

function summenAktualisieren() {
  const summen = summenBerechnen(gefilterteEintraege());
  el('summe-zeit').textContent = summen.minuten > 0 ? dauerText(summen.minuten) + ' (' + summen.minuten + ' Minuten)' : '–';
  el('summe-netto').textContent = alsEuro(summen.netto);
  el('summe-mwst').textContent = alsEuro(summen.mwst);
  el('summe-brutto').textContent = alsEuro(summen.brutto);
}

function filterAuslesen() {
  ui.filter.mandantId = el('filter-mandant').value;
  ui.filter.von = el('filter-von').value;
  ui.filter.bis = el('filter-bis').value;
  ui.filter.monat = el('filter-monat').value;
  ui.filter.jahr = el('filter-jahr').value;
  tabelleAktualisieren();
  summenAktualisieren();
  nachweisAusblenden();
}

function filterZuruecksetzen() {
  ui.filter = { mandantId: '', von: '', bis: '', monat: '', jahr: '' };
  el('filter-mandant').value = '';
  el('filter-von').value = '';
  el('filter-bis').value = '';
  el('filter-monat').value = '';
  el('filter-jahr').value = '';
  tabelleAktualisieren();
  summenAktualisieren();
  nachweisAusblenden();
}

/* =====================================================================
   6. Tätigkeitsnachweis, Druck und PDF (Bereich 5)
   ===================================================================== */

// Beschreibt den gewählten Abrechnungszeitraum in Worten
function zeitraumText(eintraege) {
  const f = ui.filter;
  if (f.von && f.bis) return datumDeutsch(f.von) + ' bis ' + datumDeutsch(f.bis);
  if (f.von) return 'ab ' + datumDeutsch(f.von);
  if (f.bis) return 'bis ' + datumDeutsch(f.bis);
  if (f.monat) {
    const monatsNamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return monatsNamen[Number(f.monat.slice(5, 7)) - 1] + ' ' + f.monat.slice(0, 4);
  }
  if (f.jahr) return 'Jahr ' + f.jahr;
  if (eintraege.length > 0) {
    const daten = eintraege.map(function (e) { return e.datum; }).sort();
    return datumDeutsch(daten[0]) + ' bis ' + datumDeutsch(daten[daten.length - 1]);
  }
  return 'Gesamter Zeitraum';
}

// Zeitraum in Kurzform für den Dateinamen, z. B. "01-07-2026_bis_31-07-2026"
function zeitraumFuerDateiname(eintraege) {
  const f = ui.filter;
  let von = f.von, bis = f.bis;
  if (f.monat) {
    von = f.monat + '-01';
    const jahr = Number(f.monat.slice(0, 4));
    const monat = Number(f.monat.slice(5, 7));
    bis = f.monat + '-' + String(new Date(jahr, monat, 0).getDate()).padStart(2, '0');
  } else if (f.jahr && !von && !bis) {
    von = f.jahr + '-01-01';
    bis = f.jahr + '-12-31';
  }
  if ((!von || !bis) && eintraege.length > 0) {
    const sortiert = eintraege.map(function (e) { return e.datum; }).sort();
    von = von || sortiert[0];
    bis = bis || sortiert[sortiert.length - 1];
  }
  if (!von || !bis) return 'Gesamt';
  return datumDeutsch(von).replace(/\./g, '-') + '_bis_' + datumDeutsch(bis).replace(/\./g, '-');
}

// Prüft, ob ein Nachweis erstellt werden kann, und liefert die nötigen Daten
function nachweisDatenErmitteln() {
  const fehlerFeld = el('ausgabe-fehler');
  fehlerFeld.hidden = true;

  const mandant = mandantVonId(ui.filter.mandantId);
  if (!mandant) {
    fehlerFeld.textContent = 'Bitte wählen Sie im Bereich 3 unter „Filter: Mandant“ einen Mandanten aus. Der Tätigkeitsnachweis wird immer für einen einzelnen Mandanten erstellt.';
    fehlerFeld.hidden = false;
    return null;
  }

  const eintraege = gefilterteEintraege().slice().sort(function (a, b) {
    return a.datum.localeCompare(b.datum) || (a.beginn || '').localeCompare(b.beginn || '');
  });
  if (eintraege.length === 0) {
    fehlerFeld.textContent = 'Für die aktuelle Auswahl sind keine Tätigkeiten vorhanden. Bitte überprüfen Sie die Filter.';
    fehlerFeld.hidden = false;
    return null;
  }

  return { mandant: mandant, eintraege: eintraege };
}

// Baut den vollständigen Tätigkeitsnachweis als HTML auf.
// Bewusst OHNE Geldbeträge: Der Nachweis ist keine Rechnung,
// sondern dokumentiert ausschließlich die erbrachten Zeiten.
function nachweisErzeugen() {
  const nachweisDaten = nachweisDatenErmitteln();
  if (!nachweisDaten) return false;

  const einstellungen = daten.einstellungen;
  const mandant = nachweisDaten.mandant;
  const eintraege = nachweisDaten.eintraege;
  const summen = summenBerechnen(eintraege);

  const kanzleiDaten = [einstellungen.kanzleiAnschrift, einstellungen.kanzleiTelefon,
    einstellungen.kanzleiEmail].filter(Boolean).join(' · ');

  let inhalt = '';
  inhalt += '<div class="nachweis-kopf">';
  inhalt += '<div><div class="nachweis-kanzlei-name">' + html(einstellungen.kanzleiName) + '</div>';
  if (kanzleiDaten) inhalt += '<div class="nachweis-kanzlei-daten">' + html(kanzleiDaten) + '</div>';
  inhalt += '</div>';
  if (einstellungen.logoDatenUrl) {
    inhalt += '<img class="nachweis-logo" src="' + einstellungen.logoDatenUrl + '" alt="Kanzlei-Logo">';
  }
  inhalt += '</div>';

  inhalt += '<h1>Tätigkeitsnachweis</h1>';

  inhalt += '<table class="nachweis-angaben">';
  inhalt += '<tr><td>PR-Nr.:</td><td>' + html(mandant.prNr) + '</td></tr>';
  inhalt += '<tr><td>Mandant:</td><td>' + html(mandant.name) + '</td></tr>';
  if (mandant.anschrift) inhalt += '<tr><td>Anschrift:</td><td>' + html(mandant.anschrift) + '</td></tr>';
  inhalt += '<tr><td>Zeitraum:</td><td>' + html(zeitraumText(eintraege)) + '</td></tr>';
  inhalt += '<tr><td>Datum der Erstellung:</td><td>' + datumDeutsch(heuteIso()) + '</td></tr>';
  inhalt += '</table>';

  inhalt += '<table class="nachweis-tabelle"><thead><tr>' +
    '<th class="spalte-datum">Datum</th><th>Tätigkeit</th><th class="zahl">Beginn</th><th class="zahl">Ende</th>' +
    '<th class="zahl">Minuten</th></tr></thead><tbody>';
  eintraege.forEach(function (e) {
    inhalt += '<tr>' +
      '<td>' + datumDeutsch(e.datum) + '</td>' +
      '<td>' + html(e.taetigkeit) + '</td>' +
      '<td class="zahl">' + html(e.beginn || '–') + '</td>' +
      '<td class="zahl">' + html(e.ende || '–') + '</td>' +
      '<td class="zahl">' + e.minuten + '</td></tr>';
  });
  inhalt += '</tbody></table>';

  inhalt += '<table class="nachweis-summen">';
  inhalt += '<tr><td>Anzahl der Tätigkeiten</td><td>' + eintraege.length + '</td></tr>';
  inhalt += '<tr><td>Gesamtminuten</td><td>' + summen.minuten + ' Minuten</td></tr>';
  inhalt += '<tr class="nachweis-gesamtzeit"><td>Gesamtzeit</td><td>' + html(dauerText(summen.minuten)) + '</td></tr>';
  inhalt += '</table>';

  // Unterschriftsbereich für einen seriösen, dokumentenhaften Abschluss
  inhalt += '<div class="nachweis-unterschrift">' +
    '<div><div class="unterschrift-linie"></div>Ort, Datum</div>' +
    '<div><div class="unterschrift-linie"></div>Unterschrift ' + html(einstellungen.kanzleiName) + '</div>' +
    '</div>';

  inhalt += '<div class="nachweis-fuss">Dieser Tätigkeitsnachweis dient der transparenten Darstellung der im angegebenen Zeitraum erbrachten anwaltlichen Leistungen. Er stellt keine Rechnung dar.</div>';

  const nachweis = el('nachweis');
  nachweis.innerHTML = inhalt;
  nachweis.hidden = false;
  return true;
}

function nachweisAusblenden() {
  el('nachweis').hidden = true;
  el('nachweis-vorschau-rahmen').hidden = true;
}

function nachweisAnzeigen() {
  if (!nachweisErzeugen()) return;
  el('nachweis-vorschau-rahmen').hidden = false;
  el('nachweis').scrollIntoView({ behavior: 'smooth' });
}

// Druckt den Nachweis; für "Als PDF speichern" wird der Dateiname als Fenstertitel gesetzt,
// damit der Browser ihn beim Speichern als PDF vorschlägt.
function nachweisDrucken(alsPdf) {
  if (!nachweisErzeugen()) return;
  el('nachweis-vorschau-rahmen').hidden = false;

  const nachweisDaten = nachweisDatenErmitteln();
  const alterTitel = document.title;
  if (alsPdf && nachweisDaten) {
    const nameTeil = nachweisDaten.mandant.name.replace(/[^A-Za-z0-9ÄÖÜäöüß-]+/g, '-');
    document.title = 'Taetigkeitsnachweis_' + nachweisDaten.mandant.prNr + '_' + nameTeil + '_' +
      zeitraumFuerDateiname(nachweisDaten.eintraege);
  }
  window.print();
  document.title = alterTitel;
}

/* =====================================================================
   7. Excel-/CSV-Export und Datensicherung (Bereich 5)
   ===================================================================== */

// Bietet eine Datei zum Herunterladen an
function dateiHerunterladen(dateiname, inhalt, mimeTyp) {
  const blob = new Blob([inhalt], { type: mimeTyp });
  const url = URL.createObjectURL(blob);
  const verweis = document.createElement('a');
  verweis.href = url;
  verweis.download = dateiname;
  document.body.appendChild(verweis);
  verweis.click();
  document.body.removeChild(verweis);
  URL.revokeObjectURL(url);
}

// Exportiert die aktuell gefilterten Einträge als CSV-Datei (in Excel direkt lesbar)
function excelExport() {
  const eintraege = gefilterteEintraege();
  const fehlerFeld = el('ausgabe-fehler');
  if (eintraege.length === 0) {
    fehlerFeld.textContent = 'Für die aktuelle Auswahl sind keine Tätigkeiten vorhanden. Bitte überprüfen Sie die Filter.';
    fehlerFeld.hidden = false;
    return;
  }
  fehlerFeld.hidden = true;

  // Feld für CSV mit Semikolon-Trennung vorbereiten
  function feld(wert) {
    const text = String(wert == null ? '' : wert);
    return '"' + text.replace(/"/g, '""') + '"';
  }
  // Zahl im deutschen Format (Komma) ohne Währungszeichen
  function zahl(wert) {
    return wert.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const zeilen = [];
  zeilen.push(['PR-Nr.', 'Name', 'Datum', 'Tätigkeit', 'Beginn', 'Ende', 'Minuten',
    'Stundensatz netto (EUR)', 'Betrag netto (EUR)', 'MwSt. (EUR)', 'Betrag brutto (EUR)'].map(feld).join(';'));

  eintraege.forEach(function (e) {
    const mandant = mandantVonId(e.mandantId);
    const betraege = berechneBetraege(e.minuten, e.stundensatz, e.mwstSatz);
    zeilen.push([
      mandant ? mandant.prNr : '', mandant ? mandant.name : '',
      datumDeutsch(e.datum), e.taetigkeit, e.beginn || '', e.ende || '', e.minuten,
      zahl(e.stundensatz), zahl(betraege.netto), zahl(betraege.mwst), zahl(betraege.brutto)
    ].map(feld).join(';'));
  });

  const summen = summenBerechnen(eintraege);
  zeilen.push('');
  zeilen.push([feld('Summe'), '', '', '', '', '', feld(summen.minuten), '',
    feld(zahl(summen.netto)), feld(zahl(summen.mwst)), feld(zahl(summen.brutto))].join(';'));

  // UTF-8-Kennzeichnung (BOM), damit Excel Umlaute korrekt anzeigt
  const inhalt = String.fromCharCode(0xFEFF) + zeilen.join('\r\n');
  dateiHerunterladen('Zeiterfassung_Export_' + heuteIso() + '.csv', inhalt, 'text/csv;charset=utf-8');
}

// Vollständige Datensicherung als JSON-Datei
function sicherungErstellen() {
  const inhalt = JSON.stringify({
    programm: 'Kanzlei Doehring Zeiterfassung',
    erstelltAm: new Date().toISOString(),
    einstellungen: daten.einstellungen,
    mandanten: daten.mandanten,
    eintraege: daten.eintraege
  }, null, 2);
  dateiHerunterladen('Datensicherung_Zeiterfassung_' + heuteIso() + '.json', inhalt, 'application/json');
}

// Datensicherung wiederherstellen (mit Warnung vor dem Überschreiben)
function sicherungWiederherstellen(datei) {
  const leser = new FileReader();
  leser.onload = function () {
    let geladen;
    try {
      geladen = JSON.parse(leser.result);
    } catch (fehler) {
      alert('Die ausgewählte Datei konnte nicht gelesen werden. Bitte wählen Sie eine gültige Datensicherungsdatei aus.');
      return;
    }
    if (!geladen || !Array.isArray(geladen.mandanten) || !Array.isArray(geladen.eintraege)) {
      alert('Die ausgewählte Datei ist keine gültige Datensicherung dieser Anwendung.');
      return;
    }
    const warnung = 'Achtung: Beim Wiederherstellen werden alle derzeit gespeicherten Daten überschrieben.\n\n' +
      'Die Sicherung enthält ' + geladen.mandanten.length + ' Mandanten und ' +
      geladen.eintraege.length + ' Tätigkeitseinträge.\n\nMöchten Sie fortfahren?';
    if (!confirm(warnung)) return;

    daten.einstellungen = Object.assign(standardEinstellungen(), geladen.einstellungen || {});
    daten.mandanten = geladen.mandanten;
    daten.eintraege = geladen.eintraege;
    ui.gewaehlterMandantId = '';
    ui.filter = { mandantId: '', von: '', bis: '', monat: '', jahr: '' };
    datenSpeichern();
    einstellungenAnzeigen();
    filterZuruecksetzen();
    allesAktualisieren();
    alert('Die Datensicherung wurde erfolgreich wiederhergestellt.');
  };
  leser.readAsText(datei);
}

/* =====================================================================
   8. Einstellungen (Bereich 6)
   ===================================================================== */

function einstellungenAnzeigen() {
  el('einstellung-stundensatz').value = daten.einstellungen.stundensatz;
  el('einstellung-mwst').value = daten.einstellungen.mwstSatz;
  el('einstellung-kanzleiname').value = daten.einstellungen.kanzleiName;
  el('einstellung-anschrift').value = daten.einstellungen.kanzleiAnschrift;
  el('einstellung-telefon').value = daten.einstellungen.kanzleiTelefon;
  el('einstellung-email').value = daten.einstellungen.kanzleiEmail;
  el('knopf-logo-entfernen').hidden = !daten.einstellungen.logoDatenUrl;
}

function einstellungenUebernehmen() {
  const satz = Number(el('einstellung-stundensatz').value);
  const mwst = Number(el('einstellung-mwst').value);
  if (Number.isFinite(satz) && satz >= 0) daten.einstellungen.stundensatz = rundeCent(satz);
  if (Number.isFinite(mwst) && mwst >= 0) daten.einstellungen.mwstSatz = mwst;
  daten.einstellungen.kanzleiName = el('einstellung-kanzleiname').value.trim() || 'Kanzlei Doehring';
  daten.einstellungen.kanzleiAnschrift = el('einstellung-anschrift').value.trim();
  daten.einstellungen.kanzleiTelefon = el('einstellung-telefon').value.trim();
  daten.einstellungen.kanzleiEmail = el('einstellung-email').value.trim();
  datenSpeichern();
  liveBerechnungAktualisieren();
}

// Bestehende Einträge nach ausdrücklicher Bestätigung mit dem aktuellen Satz neu berechnen
function eintraegeNeuBerechnen() {
  if (daten.eintraege.length === 0) {
    alert('Es sind keine Einträge vorhanden.');
    return;
  }
  const frage = 'Möchten Sie wirklich alle ' + daten.eintraege.length + ' vorhandenen Einträge mit dem aktuellen Stundensatz von ' +
    alsEuro(daten.einstellungen.stundensatz) + ' und ' + alsProzent(daten.einstellungen.mwstSatz) +
    ' Mehrwertsteuer neu berechnen?\n\nDie bisher gespeicherten Stundensätze der Einträge werden dabei ersetzt.';
  if (!confirm(frage)) return;

  daten.eintraege.forEach(function (e) {
    e.stundensatz = daten.einstellungen.stundensatz;
    e.mwstSatz = daten.einstellungen.mwstSatz;
  });
  datenSpeichern();
  allesAktualisieren();
  alert('Alle Einträge wurden neu berechnet.');
}

function logoHochladen(datei) {
  if (!datei.type.startsWith('image/')) {
    alert('Bitte wählen Sie eine Bilddatei aus (zum Beispiel PNG oder JPG).');
    return;
  }
  const leser = new FileReader();
  leser.onload = function () {
    daten.einstellungen.logoDatenUrl = leser.result;
    datenSpeichern();
    el('knopf-logo-entfernen').hidden = false;
  };
  leser.readAsDataURL(datei);
}

/* =====================================================================
   9. Passwortschutz
   ---------------------------------------------------------------------
   Das Passwort wird nicht im Klartext gespeichert, sondern nur als
   SHA-256-Prüfsumme. Standardpasswort beim ersten Start: "Doehring2026"
   (bitte nach der ersten Anmeldung in den Einstellungen ändern).
   Hinweis: Dieser Schutz sichert die Oberfläche gegen zufälligen
   Zugriff; die Daten liegen weiterhin nur lokal in diesem Browser.
   ===================================================================== */

const PASSWORT_SCHLUESSEL = 'kanzlei-doehring-passwort';
const STANDARD_PASSWORT = 'Doehring2026';

// SHA-256-Prüfsumme eines Textes als Hexadezimal-Zeichenkette
async function passwortPruefsumme(text) {
  const datenBytes = new TextEncoder().encode(text);
  const hashBytes = await crypto.subtle.digest('SHA-256', datenBytes);
  return Array.from(new Uint8Array(hashBytes))
    .map(function (b) { return b.toString(16).padStart(2, '0'); })
    .join('');
}

async function gespeichertePruefsumme() {
  let gespeichert = localStorage.getItem(PASSWORT_SCHLUESSEL);
  if (!gespeichert) {
    gespeichert = await passwortPruefsumme(STANDARD_PASSWORT);
    localStorage.setItem(PASSWORT_SCHLUESSEL, gespeichert);
  }
  return gespeichert;
}

function anwendungFreigeben() {
  document.body.classList.remove('gesperrt');
  el('anmeldung').hidden = true;
}

async function anmelden() {
  // Versehentliche Leerzeichen (z. B. durch Autovervollständigung) ignorieren
  const eingabe = el('anmeldung-passwort').value.trim();
  const fehlerFeld = el('anmeldung-fehler');
  const pruefsumme = await passwortPruefsumme(eingabe);
  if (pruefsumme === await gespeichertePruefsumme()) {
    // Anmeldung gilt für die laufende Browser-Sitzung
    sessionStorage.setItem('kanzlei-doehring-angemeldet', 'ja');
    el('anmeldung-passwort').value = '';
    fehlerFeld.hidden = true;
    anwendungFreigeben();
  } else {
    fehlerFeld.textContent = 'Das Passwort ist leider nicht richtig. Bitte versuchen Sie es erneut.';
    fehlerFeld.hidden = false;
    el('anmeldung-passwort').select();
  }
}

async function passwortAendern() {
  const aktuell = el('passwort-aktuell').value;
  const neu = el('passwort-neu').value;
  const wiederholung = el('passwort-neu-wiederholung').value;
  const fehlerFeld = el('passwort-fehler');

  let fehler = '';
  if (await passwortPruefsumme(aktuell) !== await gespeichertePruefsumme()) {
    fehler = 'Das aktuelle Passwort ist nicht richtig.';
  } else if (neu.length < 6) {
    fehler = 'Das neue Passwort muss mindestens 6 Zeichen lang sein.';
  } else if (neu !== wiederholung) {
    fehler = 'Die Wiederholung stimmt nicht mit dem neuen Passwort überein.';
  }

  if (fehler) {
    fehlerFeld.textContent = fehler;
    fehlerFeld.hidden = false;
    return;
  }

  localStorage.setItem(PASSWORT_SCHLUESSEL, await passwortPruefsumme(neu));
  el('passwort-aktuell').value = '';
  el('passwort-neu').value = '';
  el('passwort-neu-wiederholung').value = '';
  fehlerFeld.hidden = true;
  alert('Das Passwort wurde erfolgreich geändert.');
}

function passwortschutzStarten() {
  // Formular-Absenden deckt Klick auf "Anmelden" und die Eingabetaste ab
  el('anmeldung-formular').addEventListener('submit', function (ereignis) {
    ereignis.preventDefault();
    anmelden();
  });
  el('knopf-passwort-aendern').addEventListener('click', passwortAendern);

  if (sessionStorage.getItem('kanzlei-doehring-angemeldet') === 'ja') {
    anwendungFreigeben();
  } else {
    el('anmeldung-passwort').focus();
  }
}

/* =====================================================================
   Gesamtaktualisierung und Start
   ===================================================================== */

function allesAktualisieren() {
  mandantenListenAktualisieren();
  filterAuswahlenAktualisieren();
  tabelleAktualisieren();
  summenAktualisieren();
  nachweisAusblenden();
}

function ereignisseVerbinden() {
  // Bereich 1: Mandanten
  el('mandant-suche').addEventListener('input', mandantenListenAktualisieren);
  el('mandant-auswahl').addEventListener('change', function () {
    ui.gewaehlterMandantId = this.value;
    datenSpeichern();
    erfassungMandantAnzeigen();
  });
  el('knopf-neuer-mandant').addEventListener('click', function () { mandantFormularOeffnen(''); });
  el('knopf-mandant-bearbeiten').addEventListener('click', function () {
    if (!ui.gewaehlterMandantId) {
      alert('Bitte wählen Sie zuerst einen Mandanten aus.');
      return;
    }
    mandantFormularOeffnen(ui.gewaehlterMandantId);
  });
  el('knopf-mandant-loeschen').addEventListener('click', mandantLoeschen);
  el('knopf-mandant-speichern').addEventListener('click', mandantSpeichern);
  el('knopf-mandant-abbrechen').addEventListener('click', mandantFormularSchliessen);

  // Bereich 2: Erfassung mit sofortiger Berechnung
  ['eintrag-beginn', 'eintrag-ende', 'eintrag-minuten'].forEach(function (id) {
    el(id).addEventListener('input', liveBerechnungAktualisieren);
  });
  el('knopf-eintrag-speichern').addEventListener('click', eintragSpeichern);
  el('knopf-eintrag-abbrechen').addEventListener('click', erfassungZuruecksetzen);

  // Bereich 3: Filter, Sortierung, Tabellenaktionen
  ['filter-mandant', 'filter-von', 'filter-bis', 'filter-monat', 'filter-jahr'].forEach(function (id) {
    el(id).addEventListener('change', filterAuslesen);
  });
  el('knopf-filter-zuruecksetzen').addEventListener('click', filterZuruecksetzen);
  el('knopf-sortierung').addEventListener('click', function () {
    ui.sortierAbsteigend = !ui.sortierAbsteigend;
    tabelleAktualisieren();
  });
  el('taetigkeiten-tbody').addEventListener('click', function (ereignis) {
    const knopf = ereignis.target.closest('button[data-aktion]');
    if (!knopf) return;
    if (knopf.dataset.aktion === 'bearbeiten') eintragBearbeiten(knopf.dataset.id);
    if (knopf.dataset.aktion === 'loeschen') eintragLoeschen(knopf.dataset.id);
  });

  // Bereich 5: Ausgabe
  el('knopf-nachweis-anzeigen').addEventListener('click', nachweisAnzeigen);
  el('knopf-pdf').addEventListener('click', function () { nachweisDrucken(true); });
  el('knopf-drucken').addEventListener('click', function () { nachweisDrucken(false); });
  el('knopf-excel').addEventListener('click', excelExport);
  el('knopf-sicherung').addEventListener('click', sicherungErstellen);
  el('knopf-wiederherstellen').addEventListener('click', function () {
    el('datei-wiederherstellen').click();
  });
  el('datei-wiederherstellen').addEventListener('change', function () {
    if (this.files.length > 0) sicherungWiederherstellen(this.files[0]);
    this.value = '';
  });

  // Bereich 6: Einstellungen (werden bei jeder Änderung sofort übernommen)
  ['einstellung-stundensatz', 'einstellung-mwst', 'einstellung-kanzleiname',
    'einstellung-anschrift', 'einstellung-telefon', 'einstellung-email'].forEach(function (id) {
    el(id).addEventListener('change', einstellungenUebernehmen);
  });
  el('knopf-neu-berechnen').addEventListener('click', eintraegeNeuBerechnen);
  el('einstellung-logo').addEventListener('change', function () {
    if (this.files.length > 0) logoHochladen(this.files[0]);
    this.value = '';
  });
  el('knopf-logo-entfernen').addEventListener('click', function () {
    daten.einstellungen.logoDatenUrl = '';
    datenSpeichern();
    this.hidden = true;
  });
}

// Start der Anwendung
datenLaden();
ereignisseVerbinden();
passwortschutzStarten();
einstellungenAnzeigen();
erfassungZuruecksetzen();
allesAktualisieren();
