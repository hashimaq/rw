import { cn } from "@/lib/utils/cn";

export function PageSection({
  title,
  action,
  children,
  className,
  delayClass = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delayClass?: string;
}) {
  return (
    <section className={cn("space-y-4 rw-animate-in", delayClass, className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
