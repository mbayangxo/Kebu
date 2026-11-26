import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordPlatformEvent(admin: SupabaseClient, input: {
  eventType: string;
  aggregateType?: string;
  aggregateId?: string;
  projectId?: string;
  actorUserId?: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}) {
  const { error } = await admin.from("platform_events").upsert({
    event_type: input.eventType,
    aggregate_type: input.aggregateType ?? null,
    aggregate_id: input.aggregateId ?? null,
    project_id: input.projectId ?? null,
    actor_user_id: input.actorUserId ?? null,
    idempotency_key: input.idempotencyKey ?? null,
    payload: input.payload ?? {},
  }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (error) throw new Error(`Could not record platform event: ${error.message}`);
}
