import { RedWingsLogo } from "@/components/branding/red-wings-logo";
import { EmptyState } from "@/components/ui/empty-state";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-8 rw-animate-in">
      <header className="flex items-center gap-4">
        <RedWingsLogo size={52} variant="square" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-[var(--rw-muted)]">
            Red Wings · Phase roadmap
          </p>
        </div>
      </header>
      <EmptyState
        title="Coming in a later phase"
        description={description}
        showLogo={false}
      />
    </div>
  );
}
