# Spec: Meerdere pensioenoverzichten + automatische scenario's + spaargeld per scenario

## Probleemstelling

Het pensioenoverzicht van mijnpensioenoverzicht.nl bevat bedragen die afhankelijk zijn van de gekozen ingangsdatum. Als een gebruiker een scenario wil vergelijken voor pensioen op 62 jaar versus 67 jaar, zijn de uitkeringsbedragen in werkelijkheid anders — maar het huidige systeem gebruikt altijd hetzelfde JSON-bestand voor alle scenario's.

Daarnaast wil de gebruiker per scenario kunnen instellen hoeveel spaargeld hij maandelijks wil opnemen als aanvulling op zijn pensioeninkomen, inclusief een signalering wanneer dat spaargeld op is.

De oplossing bestaat uit drie samenhangende onderdelen:
1. Meerdere pensioenoverzichten uploaden (elk voor een andere ingangsdatum).
2. Scenario's worden automatisch gegenereerd op basis van de geladen overzichten — de slider verdwijnt.
3. Per scenario kan een maandelijks op te nemen spaarbedrag worden ingesteld.

---

## Vereisten

### Opslag van meerdere overzichten

- De pension store slaat een **lijst** van pensioenoverzichten op (max 3), in plaats van één enkel overzicht.
- Elk opgeslagen overzicht krijgt een **ingangsdatum** die automatisch wordt afgeleid uit de eerste leeftijdsperiode in `Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal` (de `Van.Leeftijd` van de eerste regel met een `Pensioen`-bedrag).
- Hetzelfde geldt voor de partner: ook de partner-store slaat een lijst op (max 3).
- Opslag in localStorage onder bestaande keys, maar als array: `retirement-planner-pension` en `retirement-planner-pension-partner`.

### Automatische scenario's

- De `ScenarioSelector` met slider **verdwijnt**. Scenario's worden niet meer handmatig aangemaakt.
- Zodra pensioenoverzichten geladen zijn, genereert de scenarios store automatisch één scenario per geladen overzicht. De pensioenleeftijd van elk scenario is de ingangsdatum afgeleid uit dat overzicht.
- Als overzichten worden toegevoegd of verwijderd, worden de scenario's automatisch bijgewerkt (via een `watch` op de overzichtenlijst in de pension store).
- Maximaal 3 scenario's (gelijk aan het maximum aantal overzichten).
- Als er geen overzichten zijn, toont de pagina een lege staat met instructie om overzichten te uploaden.

### Koppeling overzicht aan scenario

- Elk automatisch scenario gebruikt het overzicht waarvan de ingangsdatum overeenkomt met de pensioenleeftijd van dat scenario (exacte match, want het scenario is afgeleid van dat overzicht).
- Als er geen overzicht is, wordt `null` doorgegeven (huidig gedrag).

### Spaargeld-opnameperiodes per scenario

- Het enkelvoudige `monthlyWithdrawal: number` wordt vervangen door een lijst van **opnameperiodes**: `withdrawalPeriods: WithdrawalPeriod[]`.
- Een `WithdrawalPeriod` heeft:
  - `fromAge: Age` — startleeftijd (inclusief)
  - `toAge?: Age` — eindleeftijd (exclusief). Als leeg: periode loopt tot einde tijdlijn of tot spaarpot leeg is.
  - `monthlyAmount: number` — maandelijks op te nemen bedrag in eurocenten (≥ 0)
- Periodes mogen niet overlappen. De volgorde is op `fromAge`.
- De **spaarpot** is het initiële lump sum saldo uit `savings`-streams (type `savings` met `lumpSum`), al aanwezig in de projection engine als `cumulativeSavings` startwaarde.
- Per maand in de projectie: zoek de actieve periode op basis van `ageMonth`. Tel het `monthlyAmount` op bij `totalIncome`, maar alleen zolang `cumulativeSavings > 0`.
- De maandopname stopt zodra `cumulativeSavings ≤ 0`, ongeacht de periode.
- De scenario-kaart toont op welke leeftijd de spaarpot leeg is (of "Nooit (voldoende)").
- In de grafiek daalt het maandinkomen zichtbaar wanneer een periode eindigt of de spaarpot leeg raakt.
- `withdrawalPeriods` wordt opgeslagen als onderdeel van het scenario-object.

### Scenario-kaart (`ScenarioCard.vue`)

- Toont een bewerkbare lijst van opnameperiodes, elk met:
  - Van-leeftijd (jaren + maanden)
  - Tot-leeftijd (jaren + maanden, optioneel — leeg = open einde)
  - Maandelijks bedrag (€/mnd)
  - Verwijderknop
- Knop "Periode toevoegen" voegt een nieuwe lege periode toe.
- Bij elke wijziging wordt het scenario direct herberekend.
- Toont een rij "Spaargeld op" met de leeftijd waarop `cumulativeSavings ≤ 0`, of "Nooit (voldoende)".

### Upload UI (`PensionUpload.vue`)

- De uploadknop blijft beschikbaar zolang er minder dan 3 overzichten zijn opgeslagen.
- Na upload toont de component een **lijst van geladen overzichten**, elk met:
  - De afgeleide ingangsdatum (bijv. "Vanaf 65 jaar")
  - Een verwijderknop per overzicht
- Als er al een overzicht met dezelfde ingangsdatum bestaat, wordt het **overschreven** (niet toegevoegd als duplicaat).
- De bestaande detailtabellen (AOW, periodes, uitvoerders) tonen de gegevens van het **meest recent geselecteerde** overzicht, of het eerste in de lijst als er geen selectie is.

### Waarschuwing op scenario's pagina

- Bovenaan de scenario's pagina verschijnt altijd een `UAlert` (color `info`) als er pensioenoverzicht-data geladen is, met de tekst:
  > "De uitkeringsbedragen in uw pensioenoverzicht zijn afhankelijk van de gekozen ingangsdatum. Download voor elke pensioenleeftijd een apart overzicht via mijnpensioenoverzicht.nl voor de meest nauwkeurige berekening."
- De waarschuwing verdwijnt niet; er is geen sluitknop.

### Dashboard profiel-kaart

- De stat "Pensioenoverzicht" toont het **aantal** geladen overzichten (bijv. "2 geladen") in plaats van "Geladen" / "Niet geladen".
- Zelfde voor de partner-kaart.

---

## Acceptatiecriteria

1. Een gebruiker kan tot 3 pensioenoverzichten uploaden; een 4e upload is geblokkeerd.
2. Elk overzicht toont zijn afgeleide ingangsdatum in de lijst.
3. Een overzicht met een al bestaande ingangsdatum overschrijft het bestaande.
4. Zodra overzichten geladen zijn, verschijnen automatisch evenveel scenario's als overzichten, elk met de bijbehorende ingangsdatum als pensioenleeftijd.
5. De `ScenarioSelector` met slider is verwijderd van de scenario's pagina.
6. Als geen enkel overzicht is geladen, toont de scenario's pagina een lege staat met instructie.
7. Per scenario kunnen meerdere opnameperiodes worden ingesteld (van leeftijd tot leeftijd, met maandelijks bedrag). De laatste periode mag een open einde hebben.
8. Het opnamebedrag wordt per maand opgeteld bij het inkomen, maar stopt zodra de spaarpot leeg is.
9. De scenario-kaart toont op welke leeftijd de spaarpot leeg is.
10. In de grafiek daalt het maandinkomen zichtbaar wanneer een periode eindigt of de spaarpot leeg raakt.
11. De waarschuwing is zichtbaar op de scenario's pagina zodra er minimaal één overzicht geladen is.
12. De dashboard-stat toont het aantal geladen overzichten.
13. Alle bovenstaande punten gelden ook voor de partner.
14. Bestaande tests blijven slagen.

---

## Implementatieaanpak

1. **`domain/pension-overview.ts`** (nieuw) — pure functie `deriveIngangsdatum(overzicht: Pensioenoverzicht): Age` die de ingangsdatum afleidt uit de eerste totaalregel met een `Pensioen`-bedrag en een leeftijdsgrens als `Van`. Voeg een `.test.ts` toe.

2. **`pension.ts` store** — verander `pensionData: Pensioenoverzicht | null` naar `pensionData: Pensioenoverzicht[]` (max 3). Zelfde voor `partnerPensionData`. Pas `uploadPensionFile` / `uploadPartnerPensionFile` aan: voeg toe aan lijst of overschrijf bij zelfde ingangsdatum. Voeg `removePensionFile(index)` / `removePartnerPensionFile(index)` toe. Verwijder `findClosestOverzicht` — niet nodig omdat scenario's exact gekoppeld zijn aan hun overzicht.

3. **`types/financial.ts`** — voeg `WithdrawalPeriod` interface toe: `{ fromAge: Age, toAge?: Age, monthlyAmount: number }`.

4. **`retirement-projection.ts`** — vervang `monthlyWithdrawal: number` door `withdrawalPeriods: WithdrawalPeriod[]` in `ProjectionInput`. In de maandlus: zoek de actieve `WithdrawalPeriod` op basis van `ageMonth` (van ≤ ageMonth < tot, of geen tot = open einde). Tel `monthlyAmount` op bij `totalIncome` zolang `cumulativeSavings > 0`. `pensionData` blijft `Pensioenoverzicht | null`.

5. **`RetirementScenario` interface** — vervang `monthlyWithdrawal: number` door `withdrawalPeriods: WithdrawalPeriod[]` in het scenario-object.

6. **`scenarios.ts` store** — verwijder `addScenario`, `removeScenario`, `clearScenarios`, `refreshScenarios`. Vervang door een `watch` op `pensionStore.pensionData` (de array): genereer automatisch één scenario per overzicht, met de ingangsdatum als `retirementAge`, het bijbehorende overzicht als `pensionData`, en `withdrawalPeriods: []` als default. Voeg `updateWithdrawalPeriods(id, periods: WithdrawalPeriod[])` toe die de periodes van een scenario bijwerkt en de tijdlijn herberekent.

7. **`ScenarioCard.vue`** — vervang het enkelvoudige invoerveld door een bewerkbare lijst van opnameperiodes (van-leeftijd, tot-leeftijd optioneel, maandbedrag, verwijderknop) met een "Periode toevoegen" knop. Voeg de rij "Spaargeld op" toe: leeftijd waarop `cumulativeSavings ≤ 0`, of "Nooit (voldoende)". Bij elke wijziging: roep `scenarioStore.updateWithdrawalPeriods` aan.

7. **`ScenarioSelector.vue`** — verwijder de component (of maak hem inactief). Verwijder de import in `scenarios.vue`.

8. **`scenarios.vue`** — verwijder `ScenarioSelector`, verwijder de knoppen "Alle scenario's wissen" en "Herberekenen" (niet meer relevant). Voeg `UAlert` toe bovenaan als er overzichten geladen zijn. Pas de lege staat aan: toon instructie om overzichten te uploaden via de inkomenspagina.

9. **`PensionUpload.vue`** — toon lijst van geladen overzichten met ingangsdatum en verwijderknop. Uploadknop disabled bij 3 overzichten. Detailtabellen tonen het eerste overzicht in de lijst.

10. **`ProfileForm.vue` / `PartnerProfileForm.vue`** — pas de "Pensioenoverzicht" stat aan: toon aantal geladen overzichten (bijv. "2 geladen") of "Niet geladen".

11. **Tests** — voeg tests toe voor `deriveIngangsdatum`. Update `retirement-projection.test.ts` voor `withdrawalPeriods` in `ProjectionInput`: test dat het juiste bedrag per periode wordt opgeteld, dat de opname stopt bij een lege spaarpot, en dat een open-einde periode correct doorloopt.
