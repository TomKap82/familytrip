# FamilyTrip – Sprint 1

Private Familien-Reiseplanung für **exakt zwei gleichberechtigte Administratoren**. Enthält E-Mail-/Passwort-Login, Reisen, Etappen, Unterkünfte, Buchungsdetails, Papierkorb, manuellen JSON-Export und Firestore-Live-Synchronisation.

## Voraussetzungen
Windows 11, Node.js 22+, npm, Git und VS Code; Zwei private E-Mail-Adressen und selbst gewählte sichere Passwörter für beide Admins. Ein **neues** Firebase-Projekt (Spark-Tarif) und ein neues GitHub-Repository.

## 1. Projekt lokal starten
1. ZIP entpacken, Ordner `familytrip-sprint1` in VS Code öffnen.
2. Terminal (PowerShell): `npm install`.
3. Datei `.env.example` nach `.env.local` kopieren.
4. Firebase Console → neues Projekt → Projektübersicht → Web-App hinzufügen. Die Firebase-Webkonfiguration enthält `apiKey`, `authDomain`, `projectId`, `appId`; diese vier Werte in `.env.local` übernehmen. **Keine Service-Account-Schlüssel** eintragen.
5. Firebase → Authentication → Sign-in method → **E-Mail/Passwort** aktivieren (E-Mail-Link nicht nötig). Danach unter Authentication → Nutzer → **Nutzer hinzufügen** die zwei privaten E-Mail-Adressen mit jeweils eigenem starken Passwort eintragen. Keine öffentliche Registrierung in der App.
6. Firebase → Firestore Database → Datenbank in Produktionsmodus anlegen (Regionswahl bewusst treffen).
7. Terminal: `npm run dev`; lokale URL öffnen. Mit der ersten privaten E-Mail-Adresse und dem zugehörigen Passwort anmelden. Die App zeigt eine Firebase-UID; diese kopieren.
8. Mit der **zweiten E-Mail-Adresse** und dem zweiten Passwort einmal anmelden (z. B. separates Browserprofil) und dessen UID kopieren. Alternativ die UIDs direkt unter Firebase → Authentication → Nutzer kopieren.
9. Firebase Console → Firestore Database → Daten → Sammlung `config` erstellen → Dokument-ID `access`. Feld `adminUids`, Typ **array**, zwei Elemente vom Typ **string** mit exakt den zwei Firebase-UIDs. **Keine E-Mail-Adressen** statt UIDs verwenden. Diese Konfigurationsdaten dürfen nur in der Konsole durch den Projektinhaber verändert werden.
10. Firebase → Firestore Database → **Regeln** → Inhalt von `firestore.rules` vollständig einsetzen → **Veröffentlichen**. Die Regeln müssen **vor** produktiver Datenanlage aktiv sein.
11. Bei beiden Admins Seite neu laden. Jetzt können sie Reisen und Unterkünfte anlegen.

**Wichtig:** Die beiden UID-Konten können in der Konsole verwaltet werden, nicht durch das Frontend. Ein drittes Element in `adminUids` darf niemals hinzugefügt werden. Die Regeln erzwingen die Freigabe über dieses Konfigurationsdokument, sind aber nicht für dessen initiale Erstellung zuständig.

## 2. Daten und Sicherheit
- Die Firestore-Pfade lauten `config/access`, `trips/{tripId}`, `trips/{tripId}/stages/{stageId}` und `trips/{tripId}/accommodations/{accommodationId}`.
- Alle Datenzugriffe verlangen eine eingeloggte UID in `config/access.adminUids`.
- Browser-Clients können `config/access` weder erstellen noch ändern.
- Löschungen sind Soft-Deletes über `deletedAt`. Endgültige Löschungen werden durch Regeln verboten.
- **Wichtige Grenze:** Die Liste `adminUids` mit exakt zwei Werten muss beim administrativen Einrichten korrekt geführt werden. Änderungen durch Konsolen-Admins können die Regeln nicht verhindern.
- Der JSON-Export umfasst **die aktuell ausgewählte Reise** einschließlich aller geladenen Etappen und Unterkünfte (auch Papierkorb), kein vollständiges Archiv über alle Reisen. Exportdateien sicher aufbewahren.
- Bitte keine Passwörter, PINs oder vollständige Bankkarteninformationen in Notizen ablegen.
- Gleichzeitiges Bearbeiten desselben Objekts verwendet derzeit Last-Write-Wins; für Sprint 1 keine Konfliktauflösung implementiert.

## 3. GitHub Pages Veröffentlichung
1. Neues Repository auf GitHub erstellen, empfohlen **`familytrip`**. Keine `.env.local` committen. Für Quellcode-Privatsphäre ein privates Repo verwenden; die Pages-URL selbst bleibt öffentlich erreichbar, Daten sind aber per Firebase geschützt.
2. Code hochladen: `git init`, `git add .`, `git commit -m "FamilyTrip Sprint 1"`, `git branch -M main`, `git remote add origin https://github.com/DEIN-NAME/familytrip.git`, `git push -u origin main`.
3. GitHub Repository → Settings → Secrets and variables → Actions → **Variables** → vier Repository-Variablen hinterlegen: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Diese Web-Konfigurationswerte sind im Browser sichtbar; die Sicherheit kommt durch Auth und Firestore-Regeln.
4. Repository → Settings → Pages → Source **GitHub Actions**.
5. Repository → Actions → Workflow `Publish FamilyTrip` ausführen oder neuen Push abwarten. URL: `https://DEIN-NAME.github.io/familytrip/`.
6. Firebase Console → Authentication → Settings → **Authorized domains** → `DEIN-NAME.github.io` hinzufügen (ohne Pfad). Für E-Mail-/Passwort-Login ist diese OAuth-Weiterleitung nicht erforderlich.
7. Prüfen: Login Admin 1 und Admin 2; unbekanntes E-Mail-Konto darf keinen Zugriff bekommen; anlegen, bearbeiten, Papierkorb und zweites Gerät testen.

**Anderer Repository-Name?** `vite.config.ts` enthält für GitHub Pages den Basis-Pfad `/familytrip/`. Diesen auf `/<DEIN-REPO>/` ändern. Der Build verwendet `GITHUB_PAGES=true`. Lokal bleibt der Basis-Pfad `/`.

## 4. Prüfung
- `npm run typecheck`
- `npm run build`
- Browser testen: Reise erstellen, Etappen speichern, Unterkünfte anlegen, Bearbeiten, Soft-Delete/Wiederherstellung, Export und parallele Synchronisation.
- Für echte Firestore Security Rule Emulator-Tests muss eine separate Testumgebung mit Firebase CLI und Test-Suite eingerichtet werden. **Diese ZIP liefert noch keine automatisierten Emulator-Tests.** Produktionsfreigabe erst nach solchen Tests empfehlen.

## Umfang / Einschränkungen
Sprint 1 enthält noch **keine** vollständigen Zahlungen, Budgets, Ausflüge, Restaurants, Packlisten, PDF-Erzeugung oder Offline-PWA. Unterkunftspreise, Stornofristen, Kontaktdaten und Schlüsselhinweise sind enthalten. `totalPriceMinor` speichert Centbeträge. Die Länder- und Datumsüberprüfungen sind bewusst einfach und sollten vor großen Erweiterungen vertieft werden. Manche Datensatzabhängigkeiten (Etappe mit verknüpfter Unterkunft) werden noch nicht automatisch überprüft. Keine Garantie gegen parallele überschreibende Änderungen.


## Änderung: private E-Mail-Adresse statt Google

Die App verwendet ausschließlich E-Mail-Adresse + Passwort über Firebase Authentication. Beide Benutzer werden manuell unter Firebase → Authentication → Nutzer angelegt. Es gibt keine öffentliche Registrierung und kein Google-Login. Die Zugangsprüfung mit genau zwei UIDs in `config/access.adminUids` bleibt unverändert. Passwörter werden ausschließlich von Firebase Authentication verwaltet, niemals in Firestore oder GitHub gespeichert.
