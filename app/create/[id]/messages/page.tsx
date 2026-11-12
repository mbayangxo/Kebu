import { notFound } from "next/navigation";
import { SiteContactInbox } from "@/app/components/create/site-contact-inbox";
export default async function SiteMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  return <SiteContactInbox projectId={id} />;
}
