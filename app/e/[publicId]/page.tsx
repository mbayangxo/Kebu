import { PublicEventClient } from "./public-event-client";

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <PublicEventClient publicId={publicId.trim().toLowerCase()} />;
}
