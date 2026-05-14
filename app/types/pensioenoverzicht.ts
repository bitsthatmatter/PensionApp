/**
 * TypeScript type definities voor het Pensioenoverzicht
 * Bron: mijnpensioenoverzicht.nl — JSON download
 *
 * Alle bedragen zijn bruto in euro's per jaar.
 * Gegenereerd op basis van Pensioenoverzicht-14-05-2026.json
 */

// ---------------------------------------------------------------------------
// Primitieven & herbruikbare types
// ---------------------------------------------------------------------------

/** Leeftijd uitgedrukt in jaren en maanden. */
export interface Leeftijd {
  Jaren: number
  Maanden: number
}

/** Een periodebegingrens of -eindgrens op basis van leeftijd. */
export interface PeriodeGrensLeeftijd {
  Leeftijd: Leeftijd
}

/** Een periodebegingrens of -eindgrens op basis van een ouderdomspensioengebeurtenis. */
export interface PeriodeGrensOuderdomsEvent {
  OuderdomsPensioenEvent: 'Overlijden'
}

/** Een periodebegingrens of -eindgrens op basis van een partnerpensioengebeurtenis. */
export interface PeriodeGrensPartnerEvent {
  PartnerEvent: 'OverlijdenPartner' | 'Overlijden'
}

/** Een periodebegingrens of -eindgrens op basis van een wezenpensioengebeurtenis. */
export interface PeriodeGrensWezenEvent {
  WezenEvent: 'OverlijdenOuder'
}

/**
 * Begin of einde van een pensioenperiode.
 * Precies één van de vier varianten is aanwezig.
 */
export type PeriodeGrens =
  | PeriodeGrensLeeftijd
  | PeriodeGrensOuderdomsEvent
  | PeriodeGrensPartnerEvent
  | PeriodeGrensWezenEvent

// ---------------------------------------------------------------------------
// AOW
// ---------------------------------------------------------------------------

/** AOW-opbouwbedragen voor samenwonenden en alleenstaanden. */
export interface AOWDetailsOpbouw {
  /** Te bereiken AOW samenwonend (bruto €/jaar). */
  TeBereikenSamenwonend: number
  /** Reeds opgebouwde AOW samenwonend (bruto €/jaar). */
  OpgebouwdSamenwonend: number
  /** Te bereiken AOW alleenstaand (bruto €/jaar). */
  TeBereikenAlleenstaand: number
  /** Reeds opgebouwde AOW alleenstaand (bruto €/jaar). */
  OpgebouwdAlleenstaand: number
}

/** AOW-opbouwgegevens inclusief peildatum. */
export interface AOWDetail {
  /** Peildatum van de AOW-stand (ISO 8601 datum). */
  StandPer: string
  AOWDetailsOpbouw: AOWDetailsOpbouw
}

// ---------------------------------------------------------------------------
// Gedeelde uitvoerder-info
// ---------------------------------------------------------------------------

/** Gedeelde velden voor elke pensioenregel per uitvoerder. */
export interface UitvoerderInfo {
  /** Naam van de pensioenuitvoerder. */
  PensioenUitvoerder: string
  /** Uniek kenmerk van de pensioenregeling bij de uitvoerder. */
  HerkenningsNummer: string
  /** Peildatum van de aangeleverde gegevens (ISO 8601 datum). */
  StandPer: string
}

// ---------------------------------------------------------------------------
// Ouderdomspensioen
// ---------------------------------------------------------------------------

/** Eén ouderdomspensioenregel van een uitvoerder. */
export interface OuderdomsPensioenRegel extends UitvoerderInfo {
  /** Verwacht te bereiken pensioenbedrag (bruto €/jaar). */
  TeBereiken: number
  /** Tot peildatum opgebouwd pensioenbedrag (bruto €/jaar). */
  Opgebouwd: number
  /** Status van pensioenverevening na scheiding. */
  AfhandelingVerevening?: string
}

/** Eén leeftijdsperiode in de ouderdomspensioendetails. */
export interface OuderdomsPensioenPeriode {
  Van: PeriodeGrens
  Tot: PeriodeGrens
  /** AOW-opbouwgegevens (alleen aanwezig vanaf AOW-leeftijd). */
  AOW?: AOWDetail
  /** Zekere ouderdomspensioenen per uitvoerder. */
  Pensioen?: OuderdomsPensioenRegel[]
  /** Indicatieve (nog niet zekere) pensioenen per uitvoerder. */
  IndicatiefPensioen?: OuderdomsPensioenRegel[]
  /** Extra pensioen voor alleenstaanden per uitvoerder. */
  AlleenstaandenPensioen?: OuderdomsPensioenRegel[]
}

/** Totaalregel ouderdomspensioen voor een leeftijdsperiode (alle uitvoerders gecombineerd). */
export interface OuderdomsPensioenTotaalRegel {
  Van: PeriodeGrens
  Tot: PeriodeGrens
  /** AOW voor samenwonenden (bruto €/jaar). Aanwezig vanaf AOW-leeftijd. */
  AOWSamenwonend?: number
  /** AOW voor alleenstaanden (bruto €/jaar). Aanwezig vanaf AOW-leeftijd. */
  AOWAlleenstaand?: number
  /** Totaal zeker ouderdomspensioen (bruto €/jaar). */
  Pensioen?: number
  /** Totaal indicatief ouderdomspensioen (bruto €/jaar). */
  IndicatiefPensioen?: number
  /** Totaal extra pensioen voor alleenstaanden (bruto €/jaar). */
  AlleenstaandenPensioen?: number
}

// ---------------------------------------------------------------------------
// Partnerpensioen
// ---------------------------------------------------------------------------

/**
 * Bedragen voor partner- of wezenpensioen, vóór en na pensioendatum.
 * Alle velden zijn optioneel — welke aanwezig zijn hangt af van de periode.
 */
export interface PartnerPensioenBedragen {
  /** Verzekerd bedrag vóór pensioendatum (bruto €/jaar). */
  VerzekerdBedrag?: number
  /** Opgebouwd bedrag vóór pensioendatum (bruto €/jaar). */
  OpgebouwdBedrag?: number
  /** Verzekerd bedrag ná pensioendatum (bruto €/jaar). */
  VerzekerdBedragNaPens?: number
  /** Opgebouwd bedrag ná pensioendatum (bruto €/jaar). */
  OpgebouwdBedragNaPens?: number
}

/** Eén partnerpensioenregel van een uitvoerder. */
export interface PartnerPensioenRegel extends UitvoerderInfo {
  Bedragen: PartnerPensioenBedragen
  /** Status van pensioenafhandeling na scheiding. */
  AfhandelingScheiding?: string
}

/** Eén leeftijdsperiode in de partnerpensioendetails. */
export interface PartnerPensioenPeriode {
  Van: PeriodeGrens
  Tot: PeriodeGrens
  /** Zekere partnerpensioen-regels per uitvoerder. */
  Pensioen?: PartnerPensioenRegel[]
  /** Indicatieve partnerpensioen-regels per uitvoerder. */
  IndicatiefPensioen?: PartnerPensioenRegel[]
}

/** Totaalregel partnerpensioen voor een periode (alle uitvoerders gecombineerd). */
export interface PartnerPensioenTotaalRegel {
  Van: PeriodeGrens
  Tot: PeriodeGrens
  Pensioen?: PartnerPensioenBedragen
  IndicatiefPensioen?: PartnerPensioenBedragen
}

// ---------------------------------------------------------------------------
// Wezenpensioen
// ---------------------------------------------------------------------------

/** Eén wezenpensioenregel van een uitvoerder. */
export interface WezenPensioenRegel extends UitvoerderInfo {
  Bedragen: PartnerPensioenBedragen
  /** Geeft aan of het bedrag per kind geldt. */
  PerKind: boolean
}

/** Eén leeftijdsperiode in de wezenpensioendetails. */
export interface WezenPensioenPeriode {
  Van: PeriodeGrens
  Tot: PeriodeGrens
  Pensioen?: WezenPensioenRegel[]
}

/** Totaalregel wezenpensioen voor een periode. */
export interface WezenPensioenTotaalRegel {
  Van: PeriodeGrens
  Tot: PeriodeGrens
  Pensioen?: {
    BedragenPerKind?: PartnerPensioenBedragen
  }
}

// ---------------------------------------------------------------------------
// Totalen & Details (hoofd-secties)
// ---------------------------------------------------------------------------

export interface OuderdomsPensioenTotalen {
  OuderdomsPensioenTotaal: OuderdomsPensioenTotaalRegel[]
}

export interface PartnerPensioenTotalen {
  PartnerPensioenTotaal: PartnerPensioenTotaalRegel[]
}

export interface WezenPensioenTotalen {
  WezenPensioenTotaal: WezenPensioenTotaalRegel[]
}

/** Geaggregeerde pensioenbedragen over alle uitvoerders heen. */
export interface Totalen {
  OuderdomsPensioenTotalen: OuderdomsPensioenTotalen
  PartnerPensioenTotalen: PartnerPensioenTotalen
  WezenPensioenTotalen: WezenPensioenTotalen
}

export interface OuderdomsPensioenDetails {
  OuderdomsPensioen: OuderdomsPensioenPeriode[]
}

export interface PartnerPensioenDetails {
  PartnerPensioen: PartnerPensioenPeriode[]
}

export interface WezenPensioenDetails {
  WezenPensioen: WezenPensioenPeriode[]
}

/** Uitgesplitste gegevens per pensioenuitvoerder en leeftijdsperiode. */
export interface Details {
  OuderdomsPensioenDetails: OuderdomsPensioenDetails
  PartnerPensioenDetails: PartnerPensioenDetails
  WezenPensioenDetails: WezenPensioenDetails
}

// ---------------------------------------------------------------------------
// Root type
// ---------------------------------------------------------------------------

/**
 * Het volledige pensioenoverzicht zoals gedownload van mijnpensioenoverzicht.nl.
 *
 * @example
 * const overzicht: Pensioenoverzicht = JSON.parse(fileContent)
 */
export interface Pensioenoverzicht {
  /** Statuscode. '000' = succesvol. */
  StatusCode: string
  /** Aanmaaktijdstip van het bericht (ISO 8601). */
  TijdstipAanmakenBericht: string
  /** Disclaimers en bijzonderheden. */
  Bijzonderheden?: string[]
  /** Uitvoerders waarvoor een fout is opgetreden. */
  OntbrekendePuvsError?: string[]
  /** Uitvoerders zonder beschikbare gegevens. */
  OntbrekendePuvsGeenGegevens?: string[]
  /** Aanvullende statusberichten. */
  Statussen?: Record<string, unknown>[]
  /** Geaggregeerde totalen per leeftijdsperiode. */
  Totalen: Totalen
  /** Detailgegevens per uitvoerder en leeftijdsperiode. */
  Details: Details
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/** Controleert of een PeriodeGrens een leeftijdsgrens is. */
export function isLeeftijdsGrens(grens: PeriodeGrens): grens is PeriodeGrensLeeftijd {
  return 'Leeftijd' in grens
}

/** Controleert of een PeriodeGrens een ouderdomspensioengebeurtenis is. */
export function isOuderdomsEvent(grens: PeriodeGrens): grens is PeriodeGrensOuderdomsEvent {
  return 'OuderdomsPensioenEvent' in grens
}

/** Controleert of een PeriodeGrens een partnerpensioengebeurtenis is. */
export function isPartnerEvent(grens: PeriodeGrens): grens is PeriodeGrensPartnerEvent {
  return 'PartnerEvent' in grens
}

/** Controleert of een PeriodeGrens een wezenpensioengebeurtenis is. */
export function isWezenEvent(grens: PeriodeGrens): grens is PeriodeGrensWezenEvent {
  return 'WezenEvent' in grens
}
