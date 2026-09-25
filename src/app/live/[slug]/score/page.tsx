import { ScoringSurfaceServerGate } from "@/components/scoring/scoring-surface-server-gate";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicLiveScorePage({ params }: PageProps) {
  const { slug } = await params;
  return <ScoringSurfaceServerGate slug={slug} />;
}
