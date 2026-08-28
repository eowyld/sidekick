# Alpha Testers vers Google Sheets

La source de vérité côté app est la table Supabase `public.alpha_testers_waitlist`.

Si tu veux aussi alimenter automatiquement un Google Sheet, garde `WAITLIST_WEBHOOK_URL` et pointe-le vers un Google Apps Script publié en Web App.

## Payload envoyé par `/api/waitlist`

```json
{
  "lastName": "Dupont",
  "firstName": "Alice",
  "email": "alice@example.com",
  "status": "Artiste indépendant",
  "action": "created",
  "source": "sidekick-landing",
  "submittedAt": "2026-04-24T08:30:00.000Z"
}
```

## Google Apps Script

Crée un Google Sheet, puis ouvre `Extensions > Apps Script` et colle ce code :

```js
const SHEET_NAME = "Alpha testers";
const HEADERS = ["Date", "Nom", "Prénom", "Email", "Statut", "Source", "Action"];

function doPost(e) {
  const sheet = getSheet();
  const payload = JSON.parse(e.postData.contents || "{}");
  const email = String(payload.email || "").trim().toLowerCase();

  if (!email) {
    return json({ ok: false, error: "missing_email" });
  }

  const row = [
    payload.submittedAt || new Date().toISOString(),
    payload.lastName || "",
    payload.firstName || "",
    email,
    payload.status || "",
    payload.source || "",
    payload.action || "submitted",
  ];

  const existingRowIndex = findRowByEmail(sheet, email);

  if (existingRowIndex === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(existingRowIndex, 1, 1, HEADERS.length).setValues([row]);
  }

  return json({ ok: true });
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function findRowByEmail(sheet, email) {
  const values = sheet.getDataRange().getValues();
  const emailColumnIndex = HEADERS.indexOf("Email");

  for (let i = 1; i < values.length; i += 1) {
    const currentEmail = String(values[i][emailColumnIndex] || "").trim().toLowerCase();
    if (currentEmail === email) {
      return i + 1;
    }
  }

  return -1;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Déploiement

1. `Déployer > Nouveau déploiement`
2. Type : `Application Web`
3. Exécuter en tant que : `Moi`
4. Qui a accès : `Tout le monde`
5. Copie l'URL du Web App

## Variable d'environnement

Dans `.env.local` ou sur Vercel :

```bash
WAITLIST_WEBHOOK_URL=https://script.google.com/macros/s/TON_ID/exec
```

## Pourquoi cette approche

- Tu conserves les inscriptions en base dans Supabase.
- Tu peux exploiter la feuille Google pour tri, relance, notes, filtres ou automatisations.
- Si une personne soumet deux fois le même email, la ligne Google Sheet est mise à jour au lieu d'être dupliquée.
