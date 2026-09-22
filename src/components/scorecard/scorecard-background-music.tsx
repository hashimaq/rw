"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  configureScorecardAudio,
  disposeScorecardAudio,
} from "@/lib/scorecard/scorecard-audio";
import { cn } from "@/lib/utils/cn";

type PlaybackState = "playing" | "paused" | "blocked" | "unavailable";

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
    </svg>
  );
}

function VolumeOnIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a9 9 0 010 12.73" />
    </svg>
  );
}

function VolumeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 9l-6 6M17 9l6 6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Scorecard-only background music. Mount only on `/match/[slug]` success views.
 */
export function ScorecardBackgroundMusic({ slug }: { slug: string }) {
  const labelId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef(false);
  const [playback, setPlayback] = useState<PlaybackState>("paused");
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    userPausedRef.current = false;
    setMuted(false);
    setPlayback("paused");

    const audio = new Audio();
    audio.preload = "auto";
    configureScorecardAudio(audio);
    audioRef.current = audio;

    const onError = () => {
      setPlayback("unavailable");
    };

    audio.addEventListener("error", onError);

    void (async () => {
      try {
        await audio.play();
        setPlayback("playing");
      } catch {
        if (!audio.error) {
          setPlayback("blocked");
        }
      }
    })();

    return () => {
      audio.removeEventListener("error", onError);
      disposeScorecardAudio(audio);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [slug]);

  const togglePause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || audio.error) return;

    if (audio.paused) {
      userPausedRef.current = false;
      try {
        await audio.play();
        setPlayback("playing");
      } catch {
        setPlayback("blocked");
      }
    } else {
      userPausedRef.current = true;
      audio.pause();
      setPlayback("paused");
    }
  }, []);

  const resumeFromBlock = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || audio.error) return;
    userPausedRef.current = false;
    try {
      await audio.play();
      setPlayback("playing");
    } catch {
      setPlayback("blocked");
    }
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.error) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
  }, []);

  if (playback === "unavailable") {
    return null;
  }

  const isPlaying = playback === "playing";
  const showBlockedHint = playback === "blocked";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      aria-labelledby={labelId}
      role="group"
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-[min(100%,20rem)] flex-col items-end gap-2",
        )}
      >
        {showBlockedHint ? (
          <button
            type="button"
            className="rw-focus-ring rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)]/95 px-3 py-1.5 text-xs font-medium text-[var(--rw-muted)] shadow-sm backdrop-blur-sm"
            onClick={() => void resumeFromBlock()}
          >
            Play scorecard music
          </button>
        ) : null}
        <div className="flex items-center gap-1 rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)]/95 p-1 shadow-md backdrop-blur-sm">
          <p id={labelId} className="sr-only">
            Scorecard background music
          </p>
          <button
            type="button"
            className="rw-focus-ring flex h-10 w-10 items-center justify-center rounded-full text-[var(--rw-text)] hover:bg-[var(--rw-surface-hover)]"
            onClick={() => void togglePause()}
            aria-label={isPlaying ? "Pause scorecard music" : "Resume scorecard music"}
          >
            {isPlaying ? (
              <PauseIcon className="h-4 w-4" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="rw-focus-ring flex h-10 w-10 items-center justify-center rounded-full text-[var(--rw-text)] hover:bg-[var(--rw-surface-hover)]"
            onClick={toggleMute}
            aria-label={muted ? "Unmute scorecard music" : "Mute scorecard music"}
          >
            {muted ? (
              <VolumeOffIcon className="h-4 w-4" />
            ) : (
              <VolumeOnIcon className="h-4 w-4" />
            )}
          </button>
          <span className="hidden pr-2 text-[var(--rw-muted)] sm:inline-flex sm:items-center sm:gap-1 sm:text-[10px] sm:font-semibold sm:uppercase sm:tracking-wide">
            <MusicIcon className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Music</span>
          </span>
        </div>
      </div>
    </div>
  );
}
