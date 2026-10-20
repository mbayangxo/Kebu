import { LigueyPublicListingClient } from "@/app/components/liguey/liguey-public-listing-client";

export default async function PublicJobListingPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <LigueyPublicListingClient publicId={publicId.trim().toLowerCase()} />;
}
