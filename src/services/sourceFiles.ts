/**
 * Browser-session source file registry.
 * Uploaded originals remain local to the current browser session; they are never
 * written to localStorage or sent to the citation drawer as persistent URLs.
 */
const sourceUrls = new Map<string, string>();

export function registerSourceFile(file: File): void {
  const previous = sourceUrls.get(file.name);
  if (previous) URL.revokeObjectURL(previous);
  sourceUrls.set(file.name, URL.createObjectURL(file));
}

export function getSourceFileUrl(fileName: string): string | undefined {
  return sourceUrls.get(fileName);
}
