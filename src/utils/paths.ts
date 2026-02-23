export function shortenPath(fullPath: string): string {
  const home = fullPath.match(/^(\/Users\/[^/]+|\/home\/[^/]+)/);
  if (home) {
    return fullPath.replace(home[1], "~");
  }
  return fullPath;
}
