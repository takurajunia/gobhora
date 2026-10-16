// Writes SAMPLE CSV files to db/seed/ so we can build before the real SAZSL data arrives.
// Real data later replaces these files, using exactly the same columns.
import { mkdirSync, writeFileSync } from "node:fs";

const OUT_DIR = "db/seed";
const SEASON_START = Date.UTC(2026, 6, 4); // Saturday 4 July 2026
const DAY = 24 * 60 * 60 * 1000;

// Seeded random numbers, so every run produces the same data
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(2026);
function pick<T>(list: T[]): T {
  return list[Math.floor(random() * list.length)];
}

const venues = [
  { name: "Rufaro Stadium", area: "Mbare" },
  { name: "Gwanzura Stadium", area: "Highfield" },
  { name: "National Sports Stadium", area: "Harare" },
  { name: "Raylton Sports Club", area: "Harare" },
];

const teams = [
  {
    name: "Tornado FC",
    short: "TOR",
    area: "Mbare",
    founded: 2022,
    manager: "Tinashe Mutasa",
    venue: "Rufaro Stadium",
  },
  {
    name: "Real Stars",
    short: "RST",
    area: "Highfield",
    founded: 2019,
    manager: "Farai Ncube",
    venue: "Gwanzura Stadium",
  },
  {
    name: "Kuwadzana United",
    short: "KUW",
    area: "Kuwadzana",
    founded: 2018,
    manager: "Brighton Zhou",
    venue: "National Sports Stadium",
  },
  {
    name: "Highfield Rovers",
    short: "HRO",
    area: "Highfield",
    founded: 2015,
    manager: "Lovemore Gumbo",
    venue: "Gwanzura Stadium",
  },
  {
    name: "Arcadia FC",
    short: "ARC",
    area: "Arcadia",
    founded: 2017,
    manager: "Clever Banda",
    venue: "Raylton Sports Club",
  },
  {
    name: "Mbare Sporting",
    short: "MBS",
    area: "Mbare",
    founded: 2016,
    manager: "Gift Mapfumo",
    venue: "Rufaro Stadium",
  },
  {
    name: "Glen View Warriors",
    short: "GVW",
    area: "Glen View",
    founded: 2020,
    manager: "Admire Sibanda",
    venue: "Gwanzura Stadium",
  },
  {
    name: "Budiriro Stars",
    short: "BUD",
    area: "Budiriro",
    founded: 2021,
    manager: "Obey Mhlanga",
    venue: "Rufaro Stadium",
  },
  {
    name: "Mabvuku Eagles",
    short: "MAB",
    area: "Mabvuku",
    founded: 2014,
    manager: "Innocent Hove",
    venue: "National Sports Stadium",
  },
  {
    name: "Warren Park FC",
    short: "WPK",
    area: "Warren Park",
    founded: 2019,
    manager: "Talent Phiri",
    venue: "National Sports Stadium",
  },
  {
    name: "Dzivarasekwa United",
    short: "DZV",
    area: "Dzivarasekwa",
    founded: 2023,
    manager: "Ronald Shumba",
    venue: "Raylton Sports Club",
  },
  {
    name: "Hatfield Wanderers",
    short: "HAT",
    area: "Hatfield",
    founded: 2018,
    manager: "Kelvin Makoni",
    venue: "Raylton Sports Club",
  },
];

const firstNames = [
  "Tinashe",
  "Tafadzwa",
  "Blessing",
  "Farai",
  "Chido",
  "Tatenda",
  "Kudakwashe",
  "Tendai",
  "Takudzwa",
  "Simbarashe",
  "Tapiwa",
  "Nyasha",
  "Munyaradzi",
  "Tawanda",
  "Takunda",
  "Panashe",
  "Anesu",
  "Tonderai",
  "Shingai",
  "Tichaona",
  "Tanaka",
  "Kundai",
  "Prince",
  "Brighton",
  "Lovemore",
  "Gift",
  "Talent",
  "Innocent",
  "Clever",
  "Admire",
  "Ronald",
  "Kelvin",
  "Godknows",
  "Wellington",
  "Obey",
  "Liberty",
];
const surnames = [
  "Moyo",
  "Ncube",
  "Dube",
  "Sibanda",
  "Mpofu",
  "Mutasa",
  "Chirwa",
  "Banda",
  "Phiri",
  "Zhou",
  "Mhlanga",
  "Nyathi",
  "Gumbo",
  "Mapfumo",
  "Chigumba",
  "Muchena",
  "Mlambo",
  "Marufu",
  "Mukanya",
  "Chinembiri",
  "Makoni",
  "Hove",
  "Shumba",
  "Mavhunga",
  "Chimuka",
  "Gwenzi",
  "Matanda",
  "Nyamande",
  "Sithole",
  "Ndlovu",
  "Masuku",
  "Tshuma",
  "Mudzingwa",
  "Chari",
  "Murwira",
  "Chakanyuka",
];

// 25 players per team: 3 GK, 8 DF, 8 MF, 6 ST
const squadShape: [position: string, count: number][] = [
  ["GK", 3],
  ["DF", 8],
  ["MF", 8],
  ["ST", 6],
];

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.join(",")).join("\n") + "\n";
}

// Players (first midfielder in each squad is captain)
const playerRows: (string | number)[][] = [
  ["Name", "Team", "Position", "Jersey", "Photo", "Captain"],
];
const usedNames = new Set<string>();

for (const team of teams) {
  let jersey = 1;
  let captainChosen = false;
  for (const [position, count] of squadShape) {
    for (let i = 0; i < count; i++) {
      let name: string;
      do {
        name = `${pick(firstNames)} ${pick(surnames)}`;
      } while (usedNames.has(name));
      usedNames.add(name);

      const isCaptain = position === "MF" && !captainChosen;
      if (isCaptain) captainChosen = true;

      playerRows.push([
        name,
        team.name,
        position,
        jersey++,
        "",
        isCaptain ? "yes" : "",
      ]);
    }
  }
}

// Fixtures: double round-robin, one matchweek every Saturday
function roundRobin(teamCount: number): [number, number][][] {
  const order = Array.from({ length: teamCount }, (_, i) => i);
  const rounds: [number, number][][] = [];
  for (let round = 0; round < teamCount - 1; round++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < teamCount / 2; i++) {
      const a = order[i];
      const b = order[teamCount - 1 - i];
      pairs.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    order.splice(1, 0, order.pop()!); // rotate everyone except the first team
  }
  return rounds;
}

const firstHalf = roundRobin(teams.length);
const secondHalf = firstHalf.map((pairs) =>
  pairs.map(([home, away]) => [away, home] as [number, number]),
);
const kickoffTimes = ["11:00", "13:00", "15:00"];

const fixtureRows: (string | number)[][] = [
  ["matchweek", "date", "time", "home", "away", "venue"],
];
[...firstHalf, ...secondHalf].forEach((pairs, index) => {
  const date = new Date(SEASON_START + index * 7 * DAY)
    .toISOString()
    .slice(0, 10);
  pairs.forEach(([home, away], i) => {
    fixtureRows.push([
      index + 1,
      date,
      kickoffTimes[i % kickoffTimes.length],
      teams[home].name,
      teams[away].name,
      teams[home].venue,
    ]);
  });
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  `${OUT_DIR}/venues.csv`,
  toCsv([
    ["name", "area", "directions"],
    ...venues.map((v) => [v.name, v.area, ""]),
  ]),
);
writeFileSync(
  `${OUT_DIR}/teams.csv`,
  toCsv([
    [
      "name",
      "short_name",
      "area",
      "founded_year",
      "manager_name",
      "home_venue",
    ],
    ...teams.map((t) => [
      t.name,
      t.short,
      t.area,
      t.founded,
      t.manager,
      t.venue,
    ]),
  ]),
);
writeFileSync(`${OUT_DIR}/players.csv`, toCsv(playerRows));
writeFileSync(`${OUT_DIR}/fixtures.csv`, toCsv(fixtureRows));

console.log(`✓ Sample data written to ${OUT_DIR}/`);
console.log(
  `  ${venues.length} venues, ${teams.length} teams, ${playerRows.length - 1} players, ${fixtureRows.length - 1} fixtures`,
);
