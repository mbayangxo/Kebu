import { createAdminClient } from "@/lib/supabase/admin";
import { recordPlatformEvent } from "@/lib/platform/events";
import { enqueuePlatformJob } from "@/lib/platform/jobs";
import { platformLog } from "@/lib/platform/observability";

export async function recordProjectFlow(input: {
  eventType: string;
  projectId: string;
  actorUserId: string;
  idempotencyKey: string;
  notification?: { title: string; body: string; actionUrl?: string };
  payload?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await recordPlatformEvent(admin, {
      eventType: input.eventType,
      aggregateType: "project",
      aggregateId: input.projectId,
      projectId: input.projectId,
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
    });
    if (input.notification) {
      await enqueuePlatformJob(admin, {
        type: "notification.create",
        idempotencyKey: `notify:${input.idempotencyKey}`,
        payload: {
          userId: input.actorUserId,
          projectId: input.projectId,
          kind: input.eventType,
          ...input.notification,
        },
      });
    }
  } catch (error) {
    platformLog.error("flow_event.failed", {
      eventType: input.eventType,
      projectId: input.projectId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
