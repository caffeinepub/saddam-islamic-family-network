// urlParams.ts — utility to read URL search params or hash params safely.

export function getSecretParameter(key: string): string | null {
  try {
    // Check URL search params first
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get(key);
    if (fromSearch) return fromSearch;

    // Check hash params (e.g. #key=value)
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const fromHash = hashParams.get(key);
    if (fromHash) return fromHash;

    return null;
  } catch {
    return null;
  }
}
