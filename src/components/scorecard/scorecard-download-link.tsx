import Link from "next/link";

export function ScorecardDownloadLink({ shareSlug }: { shareSlug: string }) {
  return (
    <div className="flex justify-end">
      <Link
        href={`/api/match/${shareSlug}/scorecard-pdf`}
        className="rw-focus-ring rw-btn-secondary text-sm"
        prefetch={false}
      >
        Download Scorecard
      </Link>
    </div>
  );
}
