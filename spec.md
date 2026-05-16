# Spec: Handmatige invoer netto pensioenbedragen per scenario

## Probleemstelling

De huidige app verwacht een JSON-export van mijnpensioenoverzicht.nl. De gebruiker wil dit vervangen door handmatige invoer van netto maandbedragen die hij afleest van screenshots van zijn Rabobank pensioenoverzicht. Per pensioenleeftijd zijn er twee periodes: vóór AOW-leeftijd en ná AOW-leeftijd, elk met een eigen netto maandbedrag.

De ingevoerde bedragen moeten:
1. Worden weergegeven in een overzichtstabel (alle leeftijden naast elkaar).
2. Automatisch scenario's genereren in de bestaande scenario-engine, zodat aanvulperiodes, grafieken en vergelijkingstabellen blijven werken.

---

## Wat de screenshots laten zien

De Rabobank-screenshots tonen per pensioenleeftijd twee schermen:

**Scherm A — periode vóór AOW (bijv. 62 jaar → 67 jaar 3 maanden):**
- Pensioenuitkering bruto (€/mnd)
- Loonheffing (€/mnd)
- **Netto pensioenuitkering (€/mnd)** ← het relevante veld

**Scherm B — periode ná AOW (bijv. 67 jaar 3 maanden → overlijden):**
- Pensioenuitkering bruto (€/mnd)
- Loonheffing (€/mnd)
- Netto pensioenuitkering (€/mnd)
- AOW netto (€/mnd)
- **Totaal netto per maand (€/mnd)** ← het relevante veld

De vijf pensioenleeftijden zijn: **62, 63, 64, 65 jaar** en **67 jaar en 3 maanden**.  
De AOW-leeftijd is **67 jaar en 3 maanden** (vast).

---

## Vereisten

### Gegevensmodel: `PensionPeriodAmount` en `PensionScenarioEntry`

Nieuw type in `app/types/financial.ts`:

```ts
export interface PensionPeriodAmount {
  /** Netto maandbedrag vóór AOW-leeftijd (€/mnd). */
  netBeforeAow: number
  /** Netto maandbedrag ná AOW-leeftijd (€/mnd, inclusief AOW). */
  netAfterAow: number
}

export interface PensionScenarioEntry {
  /** Pensioenleeftijd als Age. */
  retirementAge: Age
  amounts: PensionPeriodAmount
}
```

De vijf vaste pensioenleeftijden:
- `{ years: 62, months: 0 }`
- `{ years: 63, months: 0 }`
- `{ years: 64, months: 0 }`
- `{ years: 65, months: 0 }`
- `{ years: 67, months: 3 }`

### Store: `pension.ts` — vereenvoudigd

De bestaande `Pensioenoverzicht[]`-logica (JSON-upload, `deriveIngangsdatum`, `upsertOverzicht`) wordt **volledig vervangen** door een eenvoudige store die `PensionScenarioEntry[]` beheert.

- Opslag in localStorage onder key `retirement-planner-pension-v2` (nieuwe key om conflicten met oude data te vermijden).
- De store initialiseert met de vijf vaste leeftijden, elk met `netBeforeAow: 0` en `netAfterAow: 0`.
- Functie `updateAmount(retirementAge: Age, field: 'netBeforeAow' | 'netAfterAow', value: number)` — werkt het bedrag bij en slaat op.
- Geen upload-functionaliteit meer. Geen `error`, `isLoading`, `partnerPensionData`.
- De partner-store (`partnerPensionData`) vervalt volledig.

### Invoercomponent: `PensionAmountTable.vue` (nieuw, vervangt `PensionUpload.vue`)

Locatie: `app/components/income/PensionAmountTable.vue`

Toont een tabel met:
- Kolommen: één per pensioenleeftijd (5 kolommen), header toont de leeftijd (bijv. "62 jaar", "67 jaar 3 mnd")
- Rijen:
  1. **Netto/mnd vóór AOW** — invoerveld (€, geheel getal of decimaal)
  2. **Netto/mnd ná AOW** — invoerveld (€, geheel getal of decimaal, inclusief AOW)
- Boven de tabel: korte instructietekst, bijv. _"Lees de netto maandbedragen af van uw pensioenoverzicht en vul ze hieronder in. Vóór AOW: netto pensioenuitkering. Ná AOW: totaal netto per maand (inclusief AOW)."_
- Invoervelden zijn `<UInput type="number">` met `step="1"` en `min="0"`.
- Bij elke wijziging wordt `pensionStore.updateAmount(...)` aangeroepen.
- Geen uploadknop, geen bestandsinvoer.

### Inkomenspagina (`income.vue`)

- Vervangt `<IncomePensionUpload />` door `<IncomePensionAmountTable />`.
- De partner-upload (`<IncomePensionUpload person="partner" />`) vervalt.

### Projectie-engine: `retirement-projection.ts` — aanpassing

De huidige engine leest `pensionData: Pensioenoverzicht | null` uit en zoekt de bijbehorende periode op. Dit wordt vervangen door een eenvoudiger model:

- `ProjectionInput.pensionData` wordt vervangen door `pensionAmounts: PensionPeriodAmount | null`.
- In de maandlus:
  - Als `ageMonth >= retirementAgeMonths` en `ageMonth < aowAgeMonths`: gebruik `pensionAmounts.netBeforeAow` als maandinkomen.
  - Als `ageMonth >= aowAgeMonths`: gebruik `pensionAmounts.netAfterAow` als maandinkomen.
  - Als `pensionAmounts === null`: geen pensioeninkomen.
- De AOW-logica die apart uit de JSON werd gelezen vervalt — het AOW-bedrag zit al verwerkt in `netAfterAow`.
- `partnerPensionData` vervalt uit `ProjectionInput`.
- `aowAge` blijft in `ProjectionInput` — nodig om de grens tussen de twee periodes te bepalen.

### Scenarios store (`scenarios.ts`) — aanpassing

- De `watch` op `pensionStore.pensionData` (de array van `Pensioenoverzicht[]`) wordt vervangen door een `watch` op `pensionStore.entries` (de `PensionScenarioEntry[]`).
- Per entry met minstens één bedrag > 0 (`netBeforeAow > 0 || netAfterAow > 0`) wordt automatisch een scenario aangemaakt.
- Entries met beide bedragen = 0 genereren **geen** scenario (lege staat).
- De koppeling: `projectScenario` krijgt `pensionAmounts: entry.amounts` mee in plaats van `pensionData`.
- `supplementPeriods` en `updateSupplementPeriods` blijven ongewijzigd.
- `removeScenario` blijft — verwijdert het scenario maar niet de entry (bedragen blijven bewaard in de tabel).

### Dashboard (`index.vue`) — aanpassing

- De stat "Pensioenoverzicht" toont het aantal ingevulde scenario's (entries met minstens één bedrag > 0), bijv. "3 van 5 ingevuld".
- De partner-stat vervalt.

### Scenario's pagina (`scenarios.vue`) — aanpassing

- De `UAlert` over het downloaden van aparte overzichten per leeftijd vervalt (niet meer relevant).
- Lege staat: toon instructie om bedragen in te vullen op de inkomenspagina.
- `ScenarioCard`, `ScenarioComparison`, `TimelineChart` blijven ongewijzigd.

### Verwijdering van bestaande code

De volgende bestanden/onderdelen worden verwijderd of geleegd:
- `app/components/income/PensionUpload.vue` — vervangen door `PensionAmountTable.vue`
- `app/domain/pension-overview.ts` en `pension-overview.test.ts` — niet meer nodig
- `app/types/pensioenoverzicht.ts` — niet meer nodig
- Alle imports van `Pensioenoverzicht`, `deriveIngangsdatum`, `isLeeftijdsGrens` etc.

---

## Acceptatiecriteria

1. De inkomenspagina toont een tabel met 5 kolommen (pensioenleeftijden) en 2 invoerijen (vóór/ná AOW).
2. Ingevoerde bedragen worden opgeslagen in localStorage en herladen bij refresh.
3. Elke entry met minstens één bedrag > 0 genereert automatisch een scenario.
4. Entries met beide bedragen = 0 genereren geen scenario.
5. In de projectie wordt `netBeforeAow` gebruikt vóór AOW-leeftijd en `netAfterAow` ná AOW-leeftijd.
6. Aanvulperiodes, grafieken en vergelijkingstabellen werken ongewijzigd.
7. De JSON-upload en alle `Pensioenoverzicht`-gerelateerde code zijn verwijderd.
8. De partner-pensioensectie is verwijderd van de inkomenspagina en het dashboard.
9. `pnpm test` slaagt (bestaande tests bijgewerkt voor de nieuwe `ProjectionInput`-interface).
10. De dashboard-stat toont "X van 5 ingevuld".

---

## Implementatieaanpak

1. **`app/types/financial.ts`** — voeg `PensionPeriodAmount` en `PensionScenarioEntry` toe. Verwijder `SupplementPeriod` niet (blijft nodig). Verwijder imports van `pensioenoverzicht.ts` waar aanwezig.

2. **`app/stores/pension.ts`** — herschrijf volledig: sla `PensionScenarioEntry[]` op met de 5 vaste leeftijden als initiële waarde (alle bedragen 0). Voeg `updateAmount(retirementAge, field, value)` toe. Verwijder alle JSON-upload/parse-logica, `deriveIngangsdatum`, partner-logica en `pensioenoverzicht.ts`-imports.

3. **`app/domain/retirement-projection.ts`** — vervang `pensionData: Pensioenoverzicht | null` door `pensionAmounts: PensionPeriodAmount | null` in `ProjectionInput`. Pas de maandlus aan: gebruik `netBeforeAow` / `netAfterAow` direct op basis van `aowAgeMonths`. Verwijder de AOW-lookup uit de JSON. Verwijder `partnerPensionData`. Verwijder `pensioenoverzicht.ts`-imports.

4. **`app/domain/retirement-projection.test.ts`** — update tests voor de nieuwe `ProjectionInput`-interface: vervang `pensionData` door `pensionAmounts`. Voeg tests toe voor de twee periodes (vóór/ná AOW).

5. **`app/stores/scenarios.ts`** — vervang de `watch` op `pensionStore.pensionData` door een `watch` op `pensionStore.entries`. Pas `projectScenario` aan om `pensionAmounts: entry.amounts` mee te geven. Filter entries met beide bedragen = 0 eruit. Verwijder `pensioenoverzicht.ts`-imports.

6. **`app/components/income/PensionAmountTable.vue`** (nieuw) — tabel met 5 kolommen en 2 invoerijen. Gebruikt `UInput type="number"` voor elk veld. Roept `pensionStore.updateAmount` aan bij wijziging. Toont instructietekst boven de tabel.

7. **`app/pages/income.vue`** — vervang `<IncomePensionUpload />` door `<IncomePensionAmountTable />`. Verwijder partner-upload.

8. **`app/pages/scenarios.vue`** — verwijder de `UAlert` over aparte overzichten. Pas lege staat aan: verwijs naar inkomenspagina voor het invullen van bedragen.

9. **`app/pages/index.vue`** — pas de pensioenoverzicht-stat aan: toon "X van 5 ingevuld" op basis van `pensionStore.entries`.

10. **Opruimen** — verwijder `PensionUpload.vue`, `pension-overview.ts`, `pension-overview.test.ts`, `pensioenoverzicht.ts`. Verwijder alle imports die daarnaar verwijzen.
