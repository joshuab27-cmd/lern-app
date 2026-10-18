# Lernplan

Eine kleine Web-App, um den Lern-Tagesablauf zu tracken.

## Funktionen

- **Lernzeit eintragen:** Fach, Datum, Stunden und optional eine Notiz. Die Einträge werden nach Tagen gruppiert mit Tagessumme angezeigt.
- **Übersicht:** Lernstunden heute, diese Woche und gesamt sowie die Lernzeit pro Fach.
- **Arbeiten:** Fach, Datum, Titel und Themengebiete eintragen. Die nächste Arbeit wird oben in der Übersicht mit Countdown angezeigt.
- **Themen abhaken:** Für jede Arbeit können Themengebiete hinzugefügt und abgehakt werden, sobald man sie kann – mit Fortschrittsbalken.
- **Export/Import:** Alle Daten als JSON-Datei sichern und wiederherstellen.

## Benutzung

Einfach `index.html` im Browser öffnen – keine Installation nötig.
Die Daten werden lokal im Browser (localStorage) gespeichert.

## Neue Version (`lernplan.html`)

`lernplan.html` ist die aktuelle, erweiterte Version als einzelne Datei:
Wochen-, Monats- und Fachziele, Statistik mit Stunden pro Tag, Noten in Punkten (0–15).
Als Web-Seite auf claude.ai speichert sie die Daten im eigenen Konto; lokal geöffnet im Browser.
