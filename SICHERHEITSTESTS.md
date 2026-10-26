# FamilyTrip: Firestore-Sicherheitstests

Diese Tests laufen **nur lokal** mit dem Firestore-Emulator. Sie ändern keine Daten in deinem produktiven Firebase-Projekt.

## Voraussetzungen
- Node.js 22 oder neuer
- Java installiert und im PATH (für den Firestore-Emulator); prüfen mit `java -version`
- Internetzugang für das erste Installieren von npm-Abhängigkeiten und Emulator

## Ausführen in Windows 11 / VS Code
1. Bestehende funktionierende Projektdateien vorab sichern.
2. Die Dateien dieses Pakets in den vorhandenen Projektordner übernehmen. Die persönliche `.env.local` **nicht ersetzen oder hochladen**.
3. Terminal im Projektordner öffnen und `npm install` ausführen.
4. `npm run test:rules` starten. Die Testumgebung verwendet die feste **lokale** Projekt-ID `familytrip-rules-local` und ein eigenes Emulator-Datenverzeichnis.
5. Die Tests sollen ohne fehlgeschlagene Testfälle beendet werden. Das Ergebnis im Terminal notieren.

Falls Java fehlt, muss eine kompatible JDK-Version installiert werden. Falls Port 8080 belegt ist, den Port in `firebase.json` ändern.

## Was geprüft wird
- kein anonymer oder fremder Zugriff auf `config/access` und Reisen
- beide Admin-UIDs erhalten Lese-/Schreibrechte im vorgesehenen Bereich
- selbst ein Admin kann `config/access` nicht über den Browser ändern
- ungültige Daten werden abgewiesen
- Unterkünfte und Etappen werden durch Regeln geschützt
- hartes Löschen und unbekannte Pfade bleiben gesperrt

**Einschränkung:** Dies sind 13 sicherheitsbezogene Basisprüfungen, keine Vollprüfung aller Datenvarianten, Soft-Delete-Abläufe oder konkurrierenden Änderungen. Vor der Veröffentlichung die Anwendung zusätzlich manuell auf beiden Admin-Geräten testen. Die Tests erzwingen nicht, dass `adminUids` exakt zwei Einträge hat: Die Console-Konfiguration wird separat geprüft.

Wenn alle Tests grün sind: `npm run typecheck` und `npm run build` ausführen. Danach kann die GitHub-Pages-Veröffentlichung erfolgen, wie in `README.md` beschrieben.
