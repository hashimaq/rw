import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary";

interface RwButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function RwButton({
  href,
  children,
  variant = "primary",
  className,
}: RwButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "rw-focus-ring",
        variant === "primary" ? "rw-btn-primary" : "rw-btn-secondary",
        className,
      )}
    >
      {children}
    </Link>
  );
}
