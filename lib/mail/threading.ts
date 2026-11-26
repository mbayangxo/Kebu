export function normalizeMailSubject(subject: string): string {
  let value = subject.trim().toLowerCase();
  value = value.replace(/^((re|fw|fwd)\s*:\s*)+/i, "");
  value = value.replace(/\s+/g, " ").trim();
  return value.slice(0, 240);
}

export function canonicalAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export function participantKey(addresses: string[]): string {
  return [...new Set(addresses.map(canonicalAddress).filter(Boolean))].sort().join("|").slice(0, 1200);
}

export function mailThreadIdentity(opts: {
  subject: string;
  mailboxAddress: string;
  otherAddresses: string[];
}) {
  const others = opts.otherAddresses.filter((address) => canonicalAddress(address) !== canonicalAddress(opts.mailboxAddress));
  return {
    normalizedSubject: normalizeMailSubject(opts.subject),
    participantKey: participantKey(others),
  };
}
