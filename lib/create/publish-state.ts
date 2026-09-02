export type PublishState = {
  isLive: boolean;
  hasUnpublishedChanges: boolean;
  lastPublishedAt: string | null;
  draftUpdatedAt: string | null;
  livePublicPath: string | null;
};

type TimedRow = { updated_at?: string | null };

/** Compare draft workspace timestamps to the latest live deployment. */
export function computePublishState(opts: {
  projectUpdatedAt: string | null | undefined;
  pages: TimedRow[];
  sections: TimedRow[];
  liveDeployment: { published_at: string; public_path: string } | null;
}): PublishState {
  const timestamps = [
    opts.projectUpdatedAt,
    ...opts.pages.map((p) => p.updated_at),
    ...opts.sections.map((s) => s.updated_at),
  ].filter((t): t is string => Boolean(t));

  const draftUpdatedAt =
    timestamps.length > 0
      ? timestamps.reduce((latest, t) => (t > latest ? t : latest))
      : null;

  const lastPublishedAt = opts.liveDeployment?.published_at ?? null;
  const isLive = Boolean(opts.liveDeployment);

  let hasUnpublishedChanges = !isLive;
  if (isLive && draftUpdatedAt && lastPublishedAt) {
    hasUnpublishedChanges = new Date(draftUpdatedAt).getTime() > new Date(lastPublishedAt).getTime();
  }

  return {
    isLive,
    hasUnpublishedChanges,
    lastPublishedAt,
    draftUpdatedAt,
    livePublicPath: opts.liveDeployment?.public_path ?? null,
  };
}
