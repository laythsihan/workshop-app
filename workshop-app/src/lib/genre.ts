export const GENRE_OPTIONS = [
  { value: "SHORT_STORY", label: "Short Story" },
  { value: "NOVEL_EXCERPT", label: "Novel (Excerpt)" },
  { value: "PERSONAL_ESSAY", label: "Personal Essay" },
  { value: "LYRIC_ESSAY", label: "Lyric Essay" },
  { value: "POETRY", label: "Poetry" },
  { value: "SCREENPLAY", label: "Screenplay" },
  { value: "OTHER", label: "Other" },
] as const;

export type GenreValue = (typeof GENRE_OPTIONS)[number]["value"];

export function getGenreLabel(value: string | null | undefined): string {
  if (!value) return "Unclassified";
  const option = GENRE_OPTIONS.find((o) => o.value === value);
  return option?.label ?? "Unclassified";
}
