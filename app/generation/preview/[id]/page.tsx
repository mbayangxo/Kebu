import { CandidatePreview } from "@/app/components/generation/candidate-preview";
export default async function GenerationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  return <CandidatePreview id={(await params).id} />;
}
