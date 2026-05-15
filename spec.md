# Spec: Meerdere pensioenoverzichten + automatische scenario's + spaargeld per scenario

## Probleemstelling

Het pensioenoverzicht van mijnpensioenoverzicht.nl bevat bedragen die afhankelijk zijn van de gekozen ingangsdatum. Als een gebruiker een scenario wil vergelijken voor pensioen op 62 jaar versus 67 jaar, zijn de uitkeringsbedragen in werkelijkheid anders — maar het huidige systeem gebruikt altijd hetzelfde JSON-bestand voor alle scenario's.

Daarnaast wil de gebruiker per scenario kunnen instellen tot welk bedrag hij zijn maandelijkse bruto uitkering wil kunnen aanvullen, inclusief een signalering wanneer het spaargeld dat hij daarvoor gebruikt op is.

De oplossing bestaat uit drie samenhangende onderdelen:
1. Meerdere pensioenoverzichten uploaden (elk voor een andere ingangsdatum).
2. Scenario's worden automatisch gegenereerd op basis van de geladen overzichten — de slider verdwijnt.
3. Per scenario kan worden aangegeven tot welk bedrag de maandelijkse uitkering aangevuld moet worden.

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
- Partner-overzichten genereren **geen eigen scenario's**. Ze worden gekoppeld aan het primaire scenario met dezelfde ingangsdatum: als er een partner-overzicht bestaat met dezelfde ingangsdatum als een primair scenario, wordt dat partner-overzicht meegegeven als `partnerPensionData` in de `ProjectionInput`. Als er geen match is, wordt `null` doorgegeven.

### Aan te vullen tot bedrag voor bepaalde periodes per scenario

- Het enkelvoudige `monthlyWithdrawal: number` wordt vervangen door een lijst van **aan te vullen tot periodes**: `supplementPeriods: SupplementPeriod[]`.
- Een `SupplementPeriod` heeft:
  - `fromAge: Age` — startleeftijd (inclusief)
  - `toAge?: Age` — eindleeftijd (exclusief). Als leeg: periode loopt tot einde tijdlijn of tot spaarpot leeg is.
  - `targetIncome: number` — het gewenste totale bruto maandinkomen in euro's (≥ 0)
- `monthlyWithdrawal` is **geen opgeslagen veld**. De benodigde aanvulling wordt elke maand dynamisch berekend in de projectie: `max(0, targetIncome − regulierInkomenDieMaand)`. Hierdoor past de aanvulling zich automatisch aan als bijv. AOW later start.
- Periodes mogen niet overlappen. De volgorde is op `fromAge`.
- De **spaarpot** is het lopende `cumulativeSavings` saldo (inclusief effect van regulier netto cashflow, niet alleen de initiële lump sum).
- Per maand in de projectie: zoek de actieve `SupplementPeriod` op basis van `ageMonth`. Bereken de benodigde aanvulling als `max(0, targetIncome − regulierInkomen)`. Tel dit op bij het inkomen, maar alleen zolang `cumulativeSavings > 0` (vóór de aanvulling van die maand).
- De maandaanvulling stopt zodra `cumulativeSavings ≤ 0` (vóór aanvulling), ongeacht de periode.
- De scenario-kaart toont op welke leeftijd de spaarpot leeg is (of "Nooit (voldoende)").
- In de grafiek daalt het maandinkomen zichtbaar wanneer een periode eindigt of de spaarpot leeg raakt.
- `supplementPeriods` wordt opgeslagen als onderdeel van het scenario-object.
- Voorbeeld: regulier inkomen die maand is € 3.400; `targetIncome` = € 4.300 → aanvulling = € 900.

### Scenario-kaart (`ScenarioCard.vue`)

- De bestaande verwijderknop (×) in de kaart-header blijft. Verwijderen van een scenario verwijdert het scenario uit de lijst (niet het bijbehorende overzicht).
- Toont een bewerkbare lijst van aanvulperiodes, elk met:
  - Van-leeftijd (jaren + maanden)
  - Tot-leeftijd (jaren + maanden, optioneel — leeg = open einde)
  - Gewenst totaalinkomen `targetIncome` (€/mnd)
  - Verwijderknop per periode
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
7. Per scenario kunnen meerdere aanvulperiodes worden ingesteld (van leeftijd tot leeftijd, met maandelijks bedrag). De laatste periode mag een open einde hebben.
8. Het aanvulbedrag wordt per maand opgeteld bij het inkomen, maar stopt zodra de spaarpot leeg is.
9. De scenario-kaart toont op welke leeftijd de spaarpot leeg is.
10. In de grafiek daalt het maandinkomen zichtbaar wanneer een periode eindigt of de spaarpot leeg raakt.
11. De waarschuwing is zichtbaar op de scenario's pagina zodra er minimaal één overzicht geladen is.
12. De dashboard-stat toont het aantal geladen overzichten.
13. Partner-overzichten (max 3) worden opgeslagen en getoond in `PensionUpload` (partner). Ze genereren geen eigen scenario's, maar worden gekoppeld aan het primaire scenario met dezelfde ingangsdatum als `partnerPensionData`. De dashboard-stat voor de partner toont het aantal geladen partner-overzichten.
14. Bestaande tests blijven slagen.

---

## Implementatieaanpak

1. **`domain/pension-overview.ts`** (nieuw) — pure functie `deriveIngangsdatum(overzicht: Pensioenoverzicht): Age` die de ingangsdatum afleidt als de **laagste `Van.Leeftijd`** uit alle totaalregels met een `Pensioen`-bedrag > 0 en een `LeeftijdsGrens` als `Van`. Voeg een `.test.ts` toe.

2. **`pension.ts` store** — verander `pensionData: Pensioenoverzicht | null` naar `pensionData: Pensioenoverzicht[]` (max 3). Zelfde voor `partnerPensionData`. Pas `uploadPensionFile` / `uploadPartnerPensionFile` aan: voeg toe aan lijst of overschrijf bij zelfde ingangsdatum. Voeg `removePensionFile(index)` / `removePartnerPensionFile(index)` toe. Verwijder `findClosestOverzicht` — niet nodig omdat scenario's exact gekoppeld zijn aan hun overzicht.

3. **`types/financial.ts`** — voeg `SupplementPeriod` interface toe: `{ fromAge: Age, toAge?: Age, targetIncome: number }`. Geen `monthlyWithdrawal` veld — dat is een dynamische berekening in de projectie.

4. **`retirement-projection.ts`** — voeg `supplementPeriods: SupplementPeriod[]` toe aan `ProjectionInput` (default `[]`). Voeg ook `partnerPensionData: Pensioenoverzicht | null` toe (default `null`, voor toekomstig gebruik — nog niet gebruikt in cashflow). In de maandlus: zoek de actieve `SupplementPeriod` op basis van `ageMonth` (van ≤ ageMonth < tot, of geen tot = open einde). Bereken aanvulling als `max(0, period.targetIncome − regulierInkomenDieMaand)`. Tel dit op bij het inkomen, maar **alleen als `cumulativeSavings > 0` vóór de aanvulling**. `pensionData` blijft `Pensioenoverzicht | null`.

5. **`RetirementScenario` interface** — voeg `supplementPeriods: SupplementPeriod[]` toe aan het scenario-object (default `[]`). Verwijder eventueel bestaand `monthlyWithdrawal` veld.

6. **`scenarios.ts` store** — verwijder `addScenario`, `clearScenarios`, `refreshScenarios`. Behoud `removeScenario` (verwijderknop op kaart blijft). Voeg een `watch` toe op `pensionStore.pensionData` (de array): genereer automatisch één scenario per overzicht, met de ingangsdatum als `retirementAge`, het bijbehorende overzicht als `pensionData`, het partner-overzicht met dezelfde ingangsdatum als `partnerPensionData` (of `null`), en `supplementPeriods: []` als default. Bestaande scenario's met dezelfde `retirementAge` worden bijgewerkt (niet vervangen) zodat `supplementPeriods` behouden blijft. Voeg `updateSupplementPeriods(id, periods: SupplementPeriod[])` toe die de periodes van een scenario bijwerkt en de tijdlijn herberekent.

7. **`ScenarioCard.vue`** — vervang het enkelvoudige invoerveld door een bewerkbare lijst van aanvulperiodes (van-leeftijd, tot-leeftijd optioneel, `targetIncome`, verwijderknop per periode) met een "Periode toevoegen" knop. Voeg de rij "Spaargeld op" toe: leeftijd waarop `cumulativeSavings ≤ 0`, of "Nooit (voldoende)". Bij elke wijziging: roep `scenarioStore.updateSupplementPeriods` aan. De bestaande verwijderknop (×) in de header blijft en verwijdert het scenario via `scenarioStore.removeScenario`.

7. **`ScenarioSelector.vue`** — verwijder de component (of maak hem inactief). Verwijder de import in `scenarios.vue`.

8. **`scenarios.vue`** — verwijder `ScenarioSelector`, verwijder de knoppen "Alle scenario's wissen" en "Herberekenen" (niet meer relevant). Voeg `UAlert` toe bovenaan als er overzichten geladen zijn. Pas de lege staat aan: toon instructie om overzichten te uploaden via de inkomenspagina.

9. **`PensionUpload.vue`** — toon lijst van geladen overzichten met ingangsdatum en verwijderknop. Uploadknop disabled bij 3 overzichten. Detailtabellen tonen het eerste overzicht in de lijst.

10. **`ProfileForm.vue` / `PartnerProfileForm.vue`** — pas de "Pensioenoverzicht" stat aan: toon aantal geladen overzichten (bijv. "2 geladen") of "Niet geladen".

11. **Tests** — voeg tests toe voor `deriveIngangsdatum` (inclusief geval met meerdere Van-leeftijden: laagste wordt gekozen). Update `retirement-projection.test.ts` voor `supplementPeriods` in `ProjectionInput`: test dat de aanvulling dynamisch wordt berekend per maand (`max(0, targetIncome − regulierInkomen)`), dat de aanvulling stopt als `cumulativeSavings ≤ 0`, en dat een open-einde periode correct doorloopt.
