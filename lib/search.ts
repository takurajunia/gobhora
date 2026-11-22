// Shared by server and browser: never import the database here.
export type SearchItem = {
  key: string;
  kind: "team" | "player";
  href: string;
  label: string;
  sub: string | null; // shown under the name
  terms: string; // what the search actually matches against
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

// Every word typed must appear somewhere: "chido dube", "dube chi" and "chi" all find Chido Dube
export function matchesQuery(
  query: string,
  ...fields: (string | null | undefined)[]
) {
  const haystack = normalize(fields.filter(Boolean).join(" "));
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
