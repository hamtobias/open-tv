/**
 * Works out which country (or region) an IPTV category or channel belongs to,
 * from the prefixes providers put in names: "DK | Sport", "|UK| News",
 * "US: FOX 11", "[SE] Kids", "Denmark HD", "EX-YU | Film" …
 */

export interface Country {
  /** Stable key: ISO 3166 code ("DK"), a region id ("NORDIC") or "OTHER". */
  key: string;
  name: string;
  /** File name in assets/flags (without .svg), when a flag exists. */
  flag?: string;
  region?: boolean;
}

export const OTHER_COUNTRY: Country = { key: "OTHER", name: "Other", region: true };

/** ISO 3166-1 alpha-2 → English name (from flag-icons' country list). */
const ISO: Record<string, string> = {"AF":"Afghanistan","AX":"Aland Islands","AL":"Albania","DZ":"Algeria","AS":"American Samoa","AD":"Andorra","AO":"Angola","AI":"Anguilla","AQ":"Antarctica","AG":"Antigua and Barbuda","AR":"Argentina","AM":"Armenia","AW":"Aruba","AU":"Australia","AT":"Austria","AZ":"Azerbaijan","BS":"Bahamas","BH":"Bahrain","BD":"Bangladesh","BB":"Barbados","BY":"Belarus","BE":"Belgium","BZ":"Belize","BJ":"Benin","BM":"Bermuda","BT":"Bhutan","BO":"Bolivia","BQ":"Bonaire, Sint Eustatius and Saba","BA":"Bosnia and Herzegovina","BW":"Botswana","BV":"Bouvet Island","BR":"Brazil","IO":"British Indian Ocean Territory","BN":"Brunei Darussalam","BG":"Bulgaria","BF":"Burkina Faso","BI":"Burundi","CV":"Cabo Verde","KH":"Cambodia","CM":"Cameroon","CA":"Canada","KY":"Cayman Islands","CF":"Central African Republic","TD":"Chad","CL":"Chile","CN":"China","CX":"Christmas Island","CC":"Cocos (Keeling) Islands","CO":"Colombia","KM":"Comoros","CK":"Cook Islands","CR":"Costa Rica","HR":"Croatia","CU":"Cuba","CW":"Curaçao","CY":"Cyprus","CZ":"Czech Republic","CI":"Côte d'Ivoire","CD":"Democratic Republic of the Congo","DK":"Denmark","DJ":"Djibouti","DM":"Dominica","DO":"Dominican Republic","EC":"Ecuador","EG":"Egypt","SV":"El Salvador","GQ":"Equatorial Guinea","ER":"Eritrea","EE":"Estonia","SZ":"Eswatini","ET":"Ethiopia","FK":"Falkland Islands","FO":"Faroe Islands","FM":"Federated States of Micronesia","FJ":"Fiji","FI":"Finland","FR":"France","GF":"French Guiana","PF":"French Polynesia","TF":"French Southern Territories","GA":"Gabon","GM":"Gambia","GE":"Georgia","DE":"Germany","GH":"Ghana","GI":"Gibraltar","GR":"Greece","GL":"Greenland","GD":"Grenada","GP":"Guadeloupe","GU":"Guam","GT":"Guatemala","GG":"Guernsey","GN":"Guinea","GW":"Guinea-Bissau","GY":"Guyana","HT":"Haiti","HM":"Heard Island and McDonald Islands","VA":"Holy See","HN":"Honduras","HK":"Hong Kong","HU":"Hungary","IS":"Iceland","IN":"India","ID":"Indonesia","IR":"Iran","IQ":"Iraq","IE":"Ireland","IM":"Isle of Man","IL":"Israel","IT":"Italy","JM":"Jamaica","JP":"Japan","JE":"Jersey","JO":"Jordan","KZ":"Kazakhstan","KE":"Kenya","KI":"Kiribati","KW":"Kuwait","KG":"Kyrgyzstan","LA":"Laos","LV":"Latvia","LB":"Lebanon","LS":"Lesotho","LR":"Liberia","LY":"Libya","LI":"Liechtenstein","LT":"Lithuania","LU":"Luxembourg","MO":"Macau","MG":"Madagascar","MW":"Malawi","MY":"Malaysia","MV":"Maldives","ML":"Mali","MT":"Malta","MH":"Marshall Islands","MQ":"Martinique","MR":"Mauritania","MU":"Mauritius","YT":"Mayotte","MX":"Mexico","MD":"Moldova","MC":"Monaco","MN":"Mongolia","ME":"Montenegro","MS":"Montserrat","MA":"Morocco","MZ":"Mozambique","MM":"Myanmar","NA":"Namibia","NR":"Nauru","NP":"Nepal","NL":"Netherlands","NC":"New Caledonia","NZ":"New Zealand","NI":"Nicaragua","NE":"Niger","NG":"Nigeria","NU":"Niue","NF":"Norfolk Island","KP":"North Korea","MK":"North Macedonia","MP":"Northern Mariana Islands","NO":"Norway","OM":"Oman","PK":"Pakistan","PW":"Palau","PA":"Panama","PG":"Papua New Guinea","PY":"Paraguay","PE":"Peru","PH":"Philippines","PN":"Pitcairn","PL":"Poland","PT":"Portugal","PR":"Puerto Rico","QA":"Qatar","CG":"Republic of the Congo","RO":"Romania","RU":"Russia","RW":"Rwanda","RE":"Réunion","BL":"Saint Barthélemy","SH":"Saint Helena, Ascension and Tristan da Cunha","KN":"Saint Kitts and Nevis","LC":"Saint Lucia","MF":"Saint Martin","PM":"Saint Pierre and Miquelon","VC":"Saint Vincent and the Grenadines","WS":"Samoa","SM":"San Marino","ST":"Sao Tome and Principe","SA":"Saudi Arabia","SN":"Senegal","RS":"Serbia","SC":"Seychelles","SL":"Sierra Leone","SG":"Singapore","SX":"Sint Maarten","SK":"Slovakia","SI":"Slovenia","SB":"Solomon Islands","SO":"Somalia","ZA":"South Africa","GS":"South Georgia and the South Sandwich Islands","KR":"South Korea","SS":"South Sudan","ES":"Spain","LK":"Sri Lanka","PS":"State of Palestine","SD":"Sudan","SR":"Suriname","SJ":"Svalbard and Jan Mayen","SE":"Sweden","CH":"Switzerland","SY":"Syria","TW":"Taiwan","TJ":"Tajikistan","TZ":"Tanzania","TH":"Thailand","TL":"Timor-Leste","TG":"Togo","TK":"Tokelau","TO":"Tonga","TT":"Trinidad and Tobago","TN":"Tunisia","TM":"Turkmenistan","TC":"Turks and Caicos Islands","TV":"Tuvalu","TR":"Türkiye","UG":"Uganda","UA":"Ukraine","AE":"United Arab Emirates","GB":"United Kingdom","UM":"United States Minor Outlying Islands","US":"United States","UY":"Uruguay","UZ":"Uzbekistan","VU":"Vanuatu","VE":"Venezuela","VN":"Vietnam","VG":"Virgin Islands","VI":"Virgin Islands","WF":"Wallis and Futuna","EH":"Western Sahara","YE":"Yemen","ZM":"Zambia","ZW":"Zimbabwe"};

/** Regions IPTV providers commonly use instead of a country. */
const REGIONS: Record<string, Country> = {
  ARAB: { key: "ARAB", name: "Arabic", flag: "arab", region: true },
  NORDIC: { key: "NORDIC", name: "Nordic", region: true },
  EXYU: { key: "EXYU", name: "Ex-Yu / Balkan", region: true },
  LATINO: { key: "LATINO", name: "Latino", region: true },
  AFRICA: { key: "AFRICA", name: "Africa", region: true },
  ASIA: { key: "ASIA", name: "Asia", region: true },
  EU: { key: "EU", name: "Europe", flag: "eu", region: true },
  INT: { key: "INT", name: "International", flag: "un", region: true },
  CARIB: { key: "CARIB", name: "Caribbean", region: true },
  KURD: { key: "KURD", name: "Kurdish", region: true },
};

/** Non-ISO codes and words → ISO code or region key. */
const ALIASES: Record<string, string> = {
  // common IPTV spellings
  UK: "GB", EN: "GB", ENG: "GB", GBR: "GB", ENGLAND: "GB", BRITAIN: "GB", SCOTLAND: "GB", WALES: "GB",
  AR: "ARAB", ARA: "ARAB", ARB: "ARAB", ARABIC: "ARAB", ARABIA: "ARAB", MENA: "ARAB",
  NORDIC: "NORDIC", NORDICS: "NORDIC", NORDEN: "NORDIC", SCANDINAVIA: "NORDIC", SCANDINAVIAN: "NORDIC", SCAN: "NORDIC",
  "EX-YU": "EXYU", EXYU: "EXYU", YU: "EXYU", BALKAN: "EXYU", BALKANS: "EXYU",
  LATINO: "LATINO", LATIN: "LATINO", LATAM: "LATINO", LAT: "LATINO", LATINA: "LATINO",
  AFRICA: "AFRICA", AFRICAN: "AFRICA", AFR: "AFRICA",
  ASIA: "ASIA", ASIAN: "ASIA",
  EU: "EU", EUR: "EU", EUROPE: "EU", EUROPEAN: "EU",
  INT: "INT", INTL: "INT", INTERNATIONAL: "INT", WORLD: "INT", WORLDWIDE: "INT", GLOBAL: "INT",
  CARIBBEAN: "CARIB", CARIB: "CARIB",
  KURD: "KURD", KURDISH: "KURD", KU: "KURD",
  // three-letter codes (ISO / IOC / FIFA style)
  DEN: "DK", DNK: "DK", SWE: "SE", NOR: "NO", FIN: "FI", ISL: "IS", GER: "DE", DEU: "DE", GRE: "GR",
  GRC: "GR", USA: "US", CAN: "CA", NED: "NL", NLD: "NL", HOL: "NL", BEL: "BE", FRA: "FR", ESP: "ES",
  SPA: "ES", ITA: "IT", POR: "PT", PRT: "PT", POL: "PL", TUR: "TR", ALB: "AL", BRA: "BR", ARG: "AR",
  MEX: "MX", IRL: "IE", IRE: "IE", AUS: "AU", IND: "IN", PAK: "PK", RUS: "RU", UKR: "UA", ROU: "RO",
  ROM: "RO", BUL: "BG", BGR: "BG", CRO: "HR", HRV: "HR", SRB: "RS", BIH: "BA", SLO: "SI", SVN: "SI",
  CZE: "CZ", SVK: "SK", HUN: "HU", AUT: "AT", SUI: "CH", CHE: "CH", SWI: "CH", ISR: "IL", IRN: "IR",
  PHI: "PH", PHL: "PH", CHN: "CN", JPN: "JP", KOR: "KR", RSA: "ZA", ZAF: "ZA", NZL: "NZ", CHI: "CL",
  CHL: "CL", COL: "CO", PER: "PE", VEN: "VE", POLSKA: "PL",
  // local names
  DANMARK: "DK", DANSK: "DK", DANISH: "DK", SVERIGE: "SE", SVENSK: "SE", SWEDISH: "SE", NORGE: "NO",
  NORSK: "NO", NORWEGIAN: "NO", SUOMI: "FI", FINNISH: "FI", DEUTSCHLAND: "DE", GERMAN: "DE",
  DEUTSCH: "DE", NEDERLAND: "NL", DUTCH: "NL", HOLLAND: "NL", FRENCH: "FR", ESPANA: "ES", "ESPAÑA": "ES",
  SPANISH: "ES", ITALIA: "IT", ITALIAN: "IT", PORTUGUESE: "PT", POLISH: "PL", TURKIYE: "TR",
  "TÜRKIYE": "TR", TURKISH: "TR", SHQIP: "AL", ALBANIAN: "AL", BRASIL: "BR", AMERICA: "US",
  AMERICAN: "US", CANADIAN: "CA", IRISH: "IE", INDIAN: "IN", RUSSIAN: "RU", GREEK: "GR",
  SCHWEIZ: "CH", SUISSE: "CH", OSTERREICH: "AT", "ÖSTERREICH": "AT", "ÍSLAND": "IS",
};

/** Two-letter codes that are also everyday words/abbreviations; only accepted with a separator. */
const SPACE_OK = new Set(
  "DK SE NO FI DE UK GB US CA NL FR ES PT PL TR GR AL BR MX IE AU PK RU UA RO BG HR RS BA SI CZ SK HU CH IL IR PH CN JP KR ZA NZ EN".split(" "),
);

/** Prefixes that are quality/format tags, not places. */
const NOT_A_COUNTRY = new Set(
  "TV HD SD FHD UHD 4K 8K HEVC H265 VIP PPV VOD NEW ALL TOP BEST LIVE RAW HQ LQ SUB DUB MULTI 24 247 24/7 XXX ADULT".split(" "),
);

const NAME_INDEX: [string, string][] = Object.entries(ISO)
  .map(([code, name]) => [name.toUpperCase(), code] as [string, string])
  .concat(Object.entries(ALIASES).filter(([k]) => k.length > 3))
  .sort((a, b) => b[0].length - a[0].length);

function toCountry(code: string): Country | undefined {
  const alias = ALIASES[code] ?? code;
  if (REGIONS[alias]) return REGIONS[alias];
  const name = ISO[alias];
  return name ? { key: alias, name, flag: alias.toLowerCase() } : undefined;
}

// leading decoration: |, [, (, ★, emoji, spaces …
const LEAD = /^[^\p{L}\p{N}]+/u;
const CODE_WITH_SEP = /^(\p{L}{2,3}(?:-\p{L}{2})?)\s*[:|»•\])/\u2013\u2014-]\s*/u;
const CODE_WITH_SPACE = /^([A-Z]{2,3})\s+(?=\S)/;

const cache = new Map<string, { country?: Country; rest: string }>();

function parse(name: string): { country?: Country; rest: string } {
  const hit = cache.get(name);
  if (hit) return hit;
  const result = parseUncached(name);
  if (cache.size > 20000) cache.clear();
  cache.set(name, result);
  return result;
}

function parseUncached(raw: string): { country?: Country; rest: string } {
  const name = (raw ?? "").trim();
  const s = name.replace(LEAD, "");
  const tidy = (rest: string) => rest.replace(LEAD, "").trim() || name;

  // "DK | Sport", "|DK| Sport", "[DK] Sport", "DK: Sport", "EX-YU - Film", "dk: sport"
  let m = s.match(CODE_WITH_SEP);
  if (m) {
    const token = m[1].toUpperCase();
    const country = NOT_A_COUNTRY.has(token) ? undefined : toCountry(token);
    if (country) return { country, rest: tidy(s.slice(m[0].length)) };
  }

  // "DK Sport", "USA Network" (upper-case code, known to be used this way)
  m = s.match(CODE_WITH_SPACE);
  if (m) {
    const token = m[1];
    if (!NOT_A_COUNTRY.has(token) && (token.length == 3 ? ALIASES[token] : SPACE_OK.has(token))) {
      const country = toCountry(token);
      if (country) return { country, rest: tidy(s.slice(m[0].length)) };
    }
  }

  // "Denmark HD", "UNITED KINGDOM | News", "Danmark - Sport", "Nordic Sports"
  const upper = s.toUpperCase();
  for (const [word, code] of NAME_INDEX) {
    if (!upper.startsWith(word)) continue;
    const next = upper.charAt(word.length);
    if (next && /[\p{L}\p{N}]/u.test(next)) continue;
    const country = toCountry(code);
    if (country) return { country, rest: tidy(s.slice(word.length)) };
  }
  return { rest: name };
}

/** The country or region a category/channel name points to, if any. */
export function countryOf(name?: string): Country | undefined {
  return name ? parse(name).country : undefined;
}

/** The name without its country prefix: "DK | Sport" → "Sport". */
export function withoutCountry(name?: string): string {
  return name ? parse(name).rest : "";
}

export interface CountryGroup<T> {
  country: Country;
  items: T[];
}

/** Groups items by country: countries A–Z, then regions, then "Other". */
export function groupByCountry<T>(items: T[], nameOf: (item: T) => string | undefined): CountryGroup<T>[] {
  const map = new Map<string, CountryGroup<T>>();
  for (const item of items) {
    const country = countryOf(nameOf(item)) ?? OTHER_COUNTRY;
    let group = map.get(country.key);
    if (!group) map.set(country.key, (group = { country, items: [] }));
    group.items.push(item);
  }
  const rank = (c: Country) => (c.key == "OTHER" ? 2 : c.region ? 1 : 0);
  return [...map.values()].sort(
    (a, b) => rank(a.country) - rank(b.country) || a.country.name.localeCompare(b.country.name),
  );
}
