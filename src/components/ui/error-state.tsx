"use client";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-8 text-center">
      <p className="text-sm text-[var(--rw-text)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rw-focus-ring mt-4 min-h-11 rounded-full border border-[var(--rw-border)] px-5 text-sm font-medium"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
