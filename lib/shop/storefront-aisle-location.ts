const aisleParameter = "aisle";

export function readAisleFromUrl(url: URL): string {
  return url.searchParams.get(aisleParameter) ?? "";
}

export function writeAisleToUrl(url: URL, aisle: string): URL {
  const next = new URL(url);
  if (aisle) {
    next.searchParams.set(aisleParameter, aisle);
  } else {
    next.searchParams.delete(aisleParameter);
  }
  return next;
}
