export function stableRolloutBucket(flagKey: string, subjectId: string): number {
  let hash = 2166136261;
  const input = `${flagKey}:${subjectId}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

export function resolveFeatureFlag(input: {
  enabled: boolean;
  rolloutPercent: number;
  flagKey: string;
  subjectId: string;
  override?: boolean | null;
}): boolean {
  if (input.override != null) return input.override;
  if (!input.enabled) return false;
  if (input.rolloutPercent >= 100) return true;
  if (input.rolloutPercent <= 0) return false;
  return stableRolloutBucket(input.flagKey, input.subjectId) < input.rolloutPercent;
}
