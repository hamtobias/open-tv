/**
 * Recognises which sport a TV programme is, from its title (and, on sports
 * channels, its description). Keywords cover English, Danish/Nordic and the
 * big European leagues. Icons: Material Design Icons (Apache 2.0).
 */

export interface Sport {
  key: string;
  name: string;
  icon: string; // SVG path, 24×24
}

export const SPORTS: Sport[] = [
  { key: "football", name: "Football", icon: "M16.93 17.12L16.13 15.76L17.59 11.39L19 10.92L20 11.67C20 11.7 20 11.75 20 11.81C20 11.88 20.03 11.94 20.03 12C20.03 13.97 19.37 15.71 18.06 17.21L16.93 17.12M9.75 15L8.38 10.97L12 8.43L15.62 10.97L14.25 15H9.75M12 20.03C11.12 20.03 10.29 19.89 9.5 19.61L8.81 18.1L9.47 17H14.58L15.19 18.1L14.5 19.61C13.71 19.89 12.88 20.03 12 20.03M5.94 17.21C5.41 16.59 4.95 15.76 4.56 14.75C4.17 13.73 3.97 12.81 3.97 12C3.97 11.94 4 11.88 4 11.81C4 11.75 4 11.7 4 11.67L5 10.92L6.41 11.39L7.87 15.76L7.07 17.12L5.94 17.21M11 5.29V6.69L7 9.46L5.66 9.04L5.24 7.68C5.68 7 6.33 6.32 7.19 5.66S8.87 4.57 9.65 4.35L11 5.29M14.35 4.35C15.13 4.57 15.95 5 16.81 5.66C17.67 6.32 18.32 7 18.76 7.68L18.34 9.04L17 9.47L13 6.7V5.29L14.35 4.35M4.93 4.93C3 6.89 2 9.25 2 12S3 17.11 4.93 19.07 9.25 22 12 22 17.11 21 19.07 19.07 22 14.75 22 12 21 6.89 19.07 4.93 14.75 2 12 2 6.89 3 4.93 4.93Z" },
  { key: "american", name: "American Football", icon: "M8.39 21L3 15.61C3 16.7 3.04 17.71 3.2 18.63C3.35 19.55 3.5 20.1 3.71 20.29C3.9 20.5 4.44 20.65 5.35 20.81S7.27 21 8.39 21M15.5 9.89L9.89 15.5L8.5 14.11L14.11 8.5L15.5 9.89M3.29 13.08L10.92 20.71C13.7 20.21 15.9 19.15 17.53 17.53C19.15 15.9 20.21 13.7 20.71 10.92L13.08 3.29C10.3 3.79 8.1 4.85 6.47 6.47S3.79 10.3 3.29 13.08M15.61 3L21 8.39C21 7.3 20.96 6.29 20.81 5.37C20.65 4.45 20.5 3.9 20.29 3.71C20.1 3.5 19.56 3.35 18.65 3.2S16.73 3 15.61 3Z" },
  { key: "basketball", name: "Basketball", icon: "M2.34,14.63C2.94,14.41 3.56,14.3 4.22,14.3C5.56,14.3 6.73,14.72 7.73,15.56L4.59,18.7C3.53,17.5 2.78,16.13 2.34,14.63M15.56,9.8C17.53,11.27 19.66,11.63 21.94,10.88C21.97,11.09 22,11.47 22,12C22,13.03 21.75,14.18 21.28,15.45C20.81,16.71 20.23,17.73 19.55,18.5L13.22,12.19L15.56,9.8M8.77,16.64C9.83,18.17 10.05,19.84 9.42,21.66C8,21.25 6.73,20.61 5.67,19.73L8.77,16.64M12.19,13.22L18.5,19.55C16.33,21.45 13.78,22.25 10.88,21.94C11.09,21.28 11.2,20.56 11.2,19.78C11.2,19.16 11.06,18.43 10.78,17.6C10.5,16.77 10.17,16.09 9.8,15.56L12.19,13.22M8.81,14.5C7.88,13.67 6.8,13.15 5.58,12.91C4.36,12.68 3.19,12.75 2.06,13.13C2.03,12.91 2,12.53 2,12C2,10.97 2.25,9.82 2.72,8.55C3.19,7.29 3.77,6.27 4.45,5.5L11.11,12.19L8.81,14.5M15.56,7.73C14.22,6.08 13.91,4.28 14.63,2.34C15.25,2.5 15.96,2.8 16.76,3.26C17.55,3.71 18.2,4.16 18.7,4.59L15.56,7.73M21.66,9.38C21.06,9.59 20.44,9.7 19.78,9.7C18.69,9.7 17.64,9.38 16.64,8.72L19.73,5.67C20.61,6.77 21.25,8 21.66,9.38M12.19,11.11L5.5,4.45C7.67,2.55 10.22,1.75 13.13,2.06C12.91,2.72 12.8,3.44 12.8,4.22C12.8,4.94 12.96,5.75 13.29,6.66C13.62,7.56 14,8.28 14.5,8.81L12.19,11.11Z" },
  { key: "hockey", name: "Ice Hockey", icon: "M17.68 4H14.3L12.56 8C12.53 8.04 12.45 8.22 12.31 8.5S12.06 9.04 12 9.19L9.7 4H6.32L10.41 12.84C10.5 13.06 10.73 13.59 11.11 14.43C11.5 15.28 11.78 15.91 12 16.35L13.41 19.44C13.6 19.78 13.89 19.95 14.3 19.95L19 20V16H15L13.6 12.84L17.68 4M20.03 16V20H22V17C22 16.73 21.91 16.5 21.72 16.28C21.53 16.08 21.3 16 21 16H20.03M5 16V20L9.7 19.95C10.11 19.95 10.4 19.78 10.59 19.44L11.44 17.5L9.84 14.06L9 16H5M2 20H3.97V16H3C2.7 16 2.47 16.08 2.28 16.28C2.09 16.5 2 16.73 2 17V20Z" },
  { key: "tennis", name: "Tennis", icon: "M18,15A4,4 0 0,1 22,19A4,4 0 0,1 18,23A4,4 0 0,1 14,19A4,4 0 0,1 18,15M18,17A2,2 0 0,0 16,19A2,2 0 0,0 18,21A2,2 0 0,0 20,19A2,2 0 0,0 18,17M6.05,14.54C6.05,14.54 7.46,13.12 7.47,10.3C7.11,8.11 7.97,5.54 9.94,3.58C12.87,0.65 17.14,0.17 19.5,2.5C21.83,4.86 21.35,9.13 18.42,12.06C16.46,14.03 13.89,14.89 11.7,14.53C8.88,14.54 7.46,15.95 7.46,15.95L3.22,20.19L1.81,18.78L6.05,14.54M18.07,3.93C16.5,2.37 13.5,2.84 11.35,5C9.21,7.14 8.73,10.15 10.29,11.71C11.86,13.27 14.86,12.79 17,10.65C19.16,8.5 19.63,5.5 18.07,3.93Z" },
  { key: "handball", name: "Handball", icon: "M15.83 10.43A6.93 6.93 0 0 1 18.39 14.86A6.64 6.64 0 0 1 17.5 19.5L15.78 18.5A5 5 0 0 0 16.44 16A5.22 5.22 0 0 0 15.46 13.06L9.18 23.93L7.44 22.95L10.44 17.75L8.71 16.76L7.21 19.34L5.5 18.36L10.63 9.45A7 7 0 0 1 8.8 5.46A6.91 6.91 0 0 1 9.69 1.1L11.43 2.13A4.84 4.84 0 0 0 10.91 5.9A4.74 4.74 0 0 0 13.21 8.93M16 5A2 2 0 1 0 18 7A2 2 0 0 0 16 5M13.5 1A1.5 1.5 0 1 0 15 2.5A1.5 1.5 0 0 0 13.5 1Z" },
  { key: "motorsport", name: "Motorsport", icon: "M14.4,6H20V16H13L12.6,14H7V21H5V4H14L14.4,6M14,14H16V12H18V10H16V8H14V10L13,8V6H11V8H9V6H7V8H9V10H7V12H9V10H11V12H13V10L14,12V14M11,10V8H13V10H11M14,10H16V12H14V10Z" },
  { key: "cycling", name: "Cycling", icon: "M5,20.5A3.5,3.5 0 0,1 1.5,17A3.5,3.5 0 0,1 5,13.5A3.5,3.5 0 0,1 8.5,17A3.5,3.5 0 0,1 5,20.5M5,12A5,5 0 0,0 0,17A5,5 0 0,0 5,22A5,5 0 0,0 10,17A5,5 0 0,0 5,12M14.8,10H19V8.2H15.8L13.86,4.93C13.57,4.43 13,4.1 12.4,4.1C11.93,4.1 11.5,4.29 11.2,4.6L7.5,8.29C7.19,8.6 7,9 7,9.5C7,10.13 7.33,10.66 7.85,10.97L11.2,13V18H13V11.5L10.75,9.85L13.07,7.5M19,20.5A3.5,3.5 0 0,1 15.5,17A3.5,3.5 0 0,1 19,13.5A3.5,3.5 0 0,1 22.5,17A3.5,3.5 0 0,1 19,20.5M19,12A5,5 0 0,0 14,17A5,5 0 0,0 19,22A5,5 0 0,0 24,17A5,5 0 0,0 19,12M16,4.8C17,4.8 17.8,4 17.8,3C17.8,2 17,1.2 16,1.2C15,1.2 14.2,2 14.2,3C14.2,4 15,4.8 16,4.8Z" },
  { key: "golf", name: "Golf", icon: "M19.5,18A1.5,1.5 0 0,1 21,19.5A1.5,1.5 0 0,1 19.5,21A1.5,1.5 0 0,1 18,19.5A1.5,1.5 0 0,1 19.5,18M17,5.92L11,9V18.03C13.84,18.19 16,19 16,20C16,21.1 13.31,22 10,22C6.69,22 4,21.1 4,20C4,19.26 5.21,18.62 7,18.27V20H9V2L17,5.92Z" },
  { key: "baseball", name: "Baseball", icon: "M12,2C9.5,2 7.25,2.9 5.5,4.4C6,4.81 6.41,5.27 6.8,5.76L7.89,5.13L8.89,6.87L7.89,7.44C8.45,8.53 8.82,9.73 8.95,11H10V12L10,13H8.95C8.82,14.27 8.45,15.47 7.89,16.56L8.89,17.13L7.89,18.87L6.8,18.24C6.41,18.73 6,19.19 5.5,19.6C7.25,21.1 9.5,22 12,22C14.5,22 16.75,21.1 18.5,19.6C18,19.19 17.59,18.73 17.19,18.24L16.11,18.87L15.11,17.13L16.11,16.55C15.55,15.47 15.18,14.27 15.05,13H14V11H15.05C15.18,9.73 15.55,8.53 16.11,7.45L15.11,6.87L16.11,5.13L17.19,5.76C17.59,5.27 18,4.81 18.5,4.4C16.75,2.9 14.5,2 12,2M4.12,5.85C2.79,7.55 2,9.68 2,12C2,14.32 2.79,16.45 4.12,18.15C4.46,17.87 4.76,17.55 5.05,17.22L4.43,16.87L5.43,15.13L6.16,15.56C6.55,14.77 6.82,13.91 6.93,13H6V12L6,11H6.93C6.82,10.09 6.55,9.23 6.16,8.44L5.43,8.87L4.43,7.13L5.05,6.78C4.76,6.45 4.46,6.13 4.12,5.85M19.88,5.85C19.54,6.13 19.24,6.45 18.95,6.78L19.57,7.13L18.57,8.87L17.84,8.44C17.45,9.23 17.18,10.09 17.07,11H18V13H17.07C17.18,13.91 17.45,14.77 17.84,15.56L18.57,15.13L19.57,16.87L18.95,17.22C19.24,17.55 19.54,17.87 19.88,18.15C21.21,16.45 22,14.32 22,12C22,9.68 21.21,7.55 19.88,5.85Z" },
  { key: "combat", name: "Fighting", icon: "M19,16V6H22V16H19M12,4C8,4 7,4 7,4C7,4 2,4 2,8V14C2,15.77 3,16.76 4.07,17.31C4.4,15.43 6.03,14 8,14H11V16H8A2,2 0 0,0 6,18C6,19.11 6.9,20 8,20H13C17,20 17,16 17,16V6C17,6 16,4 12,4Z" },
  { key: "darts", name: "Darts", icon: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,10.84 21.79,9.69 21.39,8.61L19.79,10.21C19.93,10.8 20,11.4 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.6,4 13.2,4.07 13.79,4.21L15.4,2.6C14.31,2.21 13.16,2 12,2M19,2L15,6V7.5L12.45,10.05C12.3,10 12.15,10 12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12C14,11.85 14,11.7 13.95,11.55L16.5,9H18L22,5H19V2M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12H16A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8V6Z" },
  { key: "snooker", name: "Snooker", icon: "M11,13H13V15H11M11,9H13V11H11M11,17H13A2,2 0 0,0 15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9A2,2 0 0,0 13,7H11A2,2 0 0,0 9,9V10.5A1.5,1.5 0 0,0 10.5,12A1.5,1.5 0 0,0 9,13.5V15A2,2 0 0,0 11,17M12,1C5.92,1 1,5.92 1,12C1,18.08 5.92,23 12,23C18.08,23 23,18.08 23,12C23,5.92 18.08,1 12,1M12,19A7,7 0 0,1 5,12A7,7 0 0,1 12,5A7,7 0 0,1 19,12A7,7 0 0,1 12,19Z" },
  { key: "cricket", name: "Cricket", icon: "M14.34,17.77L15.75,16.36L20,20.58L18.56,22L14.34,17.77M18.5,2A3.5,3.5 0 0,1 22,5.5A3.5,3.5 0 0,1 18.5,9A3.5,3.5 0 0,1 15,5.5A3.5,3.5 0 0,1 18.5,2M2.24,7.11L5.07,4.28C5.46,3.89 6.09,3.89 6.5,4.28L14.97,12.77C15.36,13.16 15.36,13.79 14.97,14.18L12.14,17C11.75,17.4 11.12,17.4 10.72,17L2.24,8.53C1.85,8.13 1.85,7.5 2.24,7.11Z" },
  { key: "rugby", name: "Rugby", icon: "M16.22,16.22C18.25,14.19 19.33,11.5 19.45,8.2C18.36,10.61 16.81,12.81 14.81,14.81C12.81,16.81 10.61,18.36 8.2,19.45C11.5,19.36 14.16,18.28 16.22,16.22M7.78,7.78C5.75,9.81 4.67,12.5 4.55,15.8C5,14.8 5.7,13.65 6.61,12.35C7.5,11.05 8.38,10 9.19,9.19C11.19,7.19 13.39,5.64 15.8,4.55C12.5,4.64 9.84,5.72 7.78,7.78M20.5,3.5C21,4.05 21.34,5.11 21.47,6.7C21.59,8.3 21.35,10.16 20.74,12.3C20.13,14.45 19.11,16.23 17.67,17.67C16.36,19 14.8,19.95 13,20.55C11.21,21.16 9.44,21.47 7.69,21.47C5.56,21.47 4.17,21.14 3.5,20.5C3,19.95 2.66,18.89 2.53,17.3C2.41,15.7 2.65,13.84 3.26,11.7C3.87,9.55 4.89,7.77 6.33,6.33C7.64,5 9.2,4.05 11,3.45C12.79,2.84 14.56,2.53 16.31,2.53C18.44,2.53 19.83,2.86 20.5,3.5Z" },
  { key: "winter", name: "Winter Sports", icon: "M17.92 13.32C17.67 13.28 16.71 13 16.46 12.89L14.39 19.37L11.3 18.24L13.5 12.47L10.45 9L13 7.54C13.45 8.67 14.17 9.62 15.12 10.4S17.16 11.67 18.38 11.86L19.5 8.43L18.06 7.96L17.54 9.56C16.88 9.28 16.3 8.86 15.8 8.32C15.3 7.77 14.94 7.13 14.72 6.41L14.39 5.33C14.27 4.93 14.04 4.61 13.71 4.37C13.38 4.14 13 4 12.63 3.97C12.24 3.94 11.86 4 11.5 4.21L8 6.23C7.63 6.44 7.36 6.74 7.19 7.12C7 7.5 6.96 7.88 7 8.29S7.26 9.06 7.54 9.37L11.11 13.08L9.42 17.54L2.47 15.05L2 16.46L16.04 21.58C16.82 21.86 17.65 22 18.53 22C19.15 22 19.76 21.92 20.36 21.77C20.95 21.61 21.5 21.39 22 21.11L20.87 20C20.12 20.33 19.34 20.5 18.53 20.5C17.87 20.5 17.21 20.39 16.55 20.17L15.8 19.89L17.92 13.32M19 3C19 4.11 18.11 5 17 5S15 4.11 15 3 15.9 1 17 1 19 1.9 19 3Z" },
  { key: "athletics", name: "Athletics", icon: "M13.5,5.5C14.59,5.5 15.5,4.58 15.5,3.5C15.5,2.38 14.59,1.5 13.5,1.5C12.39,1.5 11.5,2.38 11.5,3.5C11.5,4.58 12.39,5.5 13.5,5.5M9.89,19.38L10.89,15L13,17V23H15V15.5L12.89,13.5L13.5,10.5C14.79,12 16.79,13 19,13V11C17.09,11 15.5,10 14.69,8.58L13.69,7C13.29,6.38 12.69,6 12,6C11.69,6 11.5,6.08 11.19,6.08L6,8.28V13H8V9.58L9.79,8.88L8.19,17L3.29,16L2.89,18L9.89,19.38Z" },
  { key: "volleyball", name: "Volleyball", icon: "M19.04 4.85C17.34 3.2 15.33 2.25 13 2V5.62L22 10.8C21.72 8.5 20.73 6.5 19.04 4.85M12 22C15.44 22 18.16 20.62 20.17 17.86L17.06 16L8.07 21.2C9.32 21.73 10.64 22 12 22M13 11.41L21.15 16.07C21.59 15.13 21.88 14.14 22 13.11L13 7.93V11.41M3.88 17.81C4.54 18.72 5.26 19.46 6.05 20L15.04 14.9L12 13.15L3.88 17.81M11.04 2C10 2.09 9 2.36 8 2.8V13.15L11.04 11.41V2M2 12C2 13.39 2.3 14.77 2.89 16.12L6 14.28V4C3.33 6 2 8.65 2 12Z" },
];

const BY_KEY = new Map(SPORTS.map((s) => [s.key, s]));

/** Whole-word match that also works for words with æ, ø, å, ü … */
function words(list: string[]): RegExp {
  const body = list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*")).join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, "iu");
}

/** Checked in this order: specific sports before football, so "Premier League Darts" is darts. */
const RULES: [string, RegExp][] = [
  ["american", words(["nfl", "ncaaf", "college football", "american football", "amerikansk fodbold", "super bowl", "sunday night football", "monday night football", "thursday night football", "redzone", "red zone", "cfl", "xfl", "ufl", "ncaa football", "nfl network"])],
  ["basketball", words(["nba", "wnba", "basketball", "basket", "basketligaen", "euroleague", "eurocup", "ncaab", "march madness", "ncaa basketball", "g league", "nbl", "liga acb", "fiba"])],
  ["hockey", words(["nhl", "ice hockey", "ishockey", "eishockey", "hockey", "metal ligaen", "metalligaen", "shl", "khl", "liiga", "iihf", "hockeyallsvenskan", "champions hockey league", "stanley cup"])],
  ["tennis", words(["tennis", "atp", "wta", "wimbledon", "roland garros", "roland-garros", "australian open", "davis cup", "billie jean king cup", "itf", "laver cup", "atp finals"])],
  ["handball", words(["håndbold", "handball", "handbold", "handboll", "håndball", "handbal", "balonmano", "ehf", "herreligaen", "kvindeligaen", "bambusa kvindeligaen"])],
  ["motorsport", words(["f1", "formula 1", "formula one", "formel 1", "grand prix", "motogp", "moto2", "moto3", "nascar", "indycar", "wec", "le mans", "dtm", "wrc", "rally", "superbike", "wsbk", "speedway", "formula e", "f2", "f3", "motorsport", "supercars", "kvalifikation f1"])],
  ["cycling", words(["cykling", "cycling", "cyclisme", "ciclismo", "radsport", "sykkel", "sykling", "tour de france", "giro d'italia", "giro", "vuelta", "paris-roubaix", "uci", "cykelløb", "tour of"])],
  ["golf", words(["golf", "pga", "lpga", "dp world tour", "ryder cup", "the masters", "liv golf", "the open championship", "solheim cup"])],
  ["baseball", words(["mlb", "baseball", "world series", "npb"])],
  ["combat", words(["ufc", "boxing", "boksning", "boxen", "boxe", "mma", "bellator", "wwe", "aew", "raw", "smackdown", "kickboxing", "fight night", "pfl", "one championship", "wrestling", "brydning", "ppv boxing"])],
  ["darts", words(["darts", "dart", "pdc", "premier league darts", "world matchplay", "grand slam of darts"])],
  ["snooker", words(["snooker", "billiards", "billiard", "mosconi cup", "nine-ball", "9-ball"])],
  ["cricket", words(["cricket", "ipl", "t20", "odi", "test match", "the ashes", "big bash", "the hundred"])],
  ["rugby", words(["rugby", "six nations", "super rugby", "nrl", "premiership rugby", "top 14", "urc"])],
  ["winter", words(["alpine skiing", "alpint", "skiing", "ski", "biathlon", "skiskydning", "skiskyting", "langrend", "langrenn", "cross-country", "ski jumping", "skihop", "hopp", "snowboard", "curling", "figure skating", "kunstskøjteløb", "bobsleigh", "bobslæde", "luge", "speed skating", "skøjteløb"])],
  ["athletics", words(["athletics", "atletik", "friidrett", "friidrott", "leichtathletik", "diamond league", "marathon", "maraton"])],
  ["volleyball", words(["volleyball", "volley", "beach volley", "beachvolley"])],
  ["football", words([
    "fodbold", "football", "soccer", "fútbol", "futbol", "calcio", "fußball", "fussball", "voetbal", "fotboll", "fotball", "jalkapallo",
    "premier league", "efl", "championship", "fa cup", "carabao cup", "league cup", "la liga", "laliga", "copa del rey", "serie a", "serie b",
    "coppa italia", "bundesliga", "2. bundesliga", "dfb-pokal", "dfb pokal", "ligue 1", "ligue 2", "coupe de france", "eredivisie", "knvb",
    "superliga", "superligaen", "3f superliga", "1. division", "nordicbet liga", "landspokalturneringen", "pokalen", "dbu",
    "allsvenskan", "superettan", "eliteserien", "obos-ligaen", "veikkausliiga", "primeira liga", "liga portugal", "taça",
    "scottish premiership", "spfl", "süper lig", "super lig", "ekstraklasa", "jupiler pro league", "pro league", "a-league",
    "mls", "liga mx", "saudi pro league", "brasileirão", "brasileirao", "libertadores", "sudamericana", "concacaf",
    "champions league", "europa league", "conference league", "uefa", "fifa", "world cup", "vm-kvalifikation", "em-kvalifikation",
    "nations league", "euro 2028", "club world cup", "super cup", "supercup", "supercopa", "landskamp", "kvindelandsholdet", "herrelandsholdet",
    "womens super league", "wsl", "damallsvenskan", "gjensidige kvindeliga",
  ])],
];

const MATCH_SHAPE = /\s(?:vs\.?|v|-|–|@)\s|[\p{L}.]\s?-\s?[\p{Lu}]/u;

const LIVE_TAG = words(["live", "direkte", "direkt", "direct", "en vivo", "ao vivo", "in diretta", "(l)", "(d)", "(live)"]);

/** Studio shows, magazines, highlights and re-runs rather than the game itself. */
const EXTRA = words([
  "highlights", "højdepunkter", "høydepunkter", "höjdpunkter", "resumé", "goals", "alle mål", "mål og highlights",
  "magasin", "magazine", "studio", "studiet", "preview", "review", "før", "efter kampen", "pre-game", "pregame", "post-game",
  "postgame", "pre-match", "post-match", "build-up", "countdown", "kickoff show", "half-time", "halftime", "pause",
  "news", "nyheder", "sportsnyheder", "sportscenter", "sporten", "nyhetene", "talk", "podcast", "quiz", "documentary",
  "dokumentar", "classic", "classics", "klassiker", "best of", "reprise", "genudsendelse", "replay", "re-run", "rerun",
  "(r)", "repetition", "tv-kampen", "the debate", "inside", "weekly", "show", "special",
]);

const SPORTS_CHANNEL = words([
  "sport", "sports", "sporten", "espn", "eurosport", "dazn", "bein", "viaplay", "v sport", "tv 2 sport", "tv2 sport",
  "sky sports", "tnt sports", "fox sports", "nbc sports", "cbs sports", "bt sport", "premier sports", "arena sport",
  "supersport", "setanta", "ziggo sport", "canal+ sport", "sportdigital", "sportklub", "match!", "nfl", "nba", "nhl",
  "mlb", "golf", "tennis", "f1", "racing", "motorsport", "ufc", "fight", "wwe", "boxing", "ppv", "football", "fodbold",
  "soccer", "calcio", "futbol", "laliga", "bundesliga", "premier league", "cricket", "rugby", "olympic", "olympics",
  "events", "event", "tv 2 sport x", "max sport", "c more sport", "discovery+", "hbo max sport", "dr sporten",
]);

export function sportByKey(key: string): Sport | undefined {
  return BY_KEY.get(key);
}

function match(text: string): Sport | undefined {
  for (const [key, re] of RULES) if (re.test(text)) return BY_KEY.get(key);
  return undefined;
}

/** Is this channel (or its category) about sport? */
export function isSportsChannel(channelName?: string, groupName?: string): boolean {
  return SPORTS_CHANNEL.test(channelName ?? "") || SPORTS_CHANNEL.test(groupName ?? "");
}

/**
 * The sport a programme is, or undefined.
 * Titles decide; on a sports channel a match-like title ("A - B", "A vs B")
 * can borrow the sport from the description or from the channel itself ("NBA TV").
 */
export function classify(title: string, description: string | undefined, channelName: string, sportsChannel: boolean): Sport | undefined {
  const byTitle = match(title);
  if (byTitle) return byTitle;
  if (!sportsChannel) return undefined;
  const looksLikeGame = MATCH_SHAPE.test(title) || LIVE_TAG.test(title);
  if (!looksLikeGame) return undefined;
  return match(description ?? "") ?? match(channelName);
}

export function isExtra(title: string): boolean {
  return EXTRA.test(title);
}

export function isLiveTagged(title: string): boolean {
  return LIVE_TAG.test(title);
}

/** Same game on several channels → same key. */
export function eventKey(title: string, start: number): string {
  const norm = title
    .toLowerCase()
    .replace(LIVE_TAG, " ")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return `${norm}|${Math.round(start / 900)}`;
}
