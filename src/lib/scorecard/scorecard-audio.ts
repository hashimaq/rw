import {
  SCORECARD_MUSIC_SRC,
  SCORECARD_MUSIC_VOLUME,
} from "@/lib/scorecard/scorecard-music-config";

export interface ScorecardAudioLike {
  loop: boolean;
  volume: number;
  muted: boolean;
  src: string;
  error: unknown;
  paused: boolean;
  pause: () => void;
  play: () => Promise<void>;
}

export type ScorecardMusicPlaybackResult = "playing" | "blocked" | "unavailable";

/** Configure a native Audio instance for scorecard background playback. */
export function configureScorecardAudio(audio: ScorecardAudioLike): void {
  audio.loop = true;
  audio.volume = SCORECARD_MUSIC_VOLUME;
  if (!audio.src) {
    audio.src = SCORECARD_MUSIC_SRC;
  }
}

/** Stop and release an audio instance (scorecard unmount). */
export function disposeScorecardAudio(audio: ScorecardAudioLike): void {
  audio.pause();
  audio.src = "";
}

export async function attemptScorecardMusicPlayback(
  audio: ScorecardAudioLike,
): Promise<ScorecardMusicPlaybackResult> {
  if (audio.error) {
    return "unavailable";
  }
  if (!audio.paused) {
    return "playing";
  }
  try {
    await audio.play();
    return "playing";
  } catch {
    return "blocked";
  }
}

type ScorecardMusicSession = {
  slug: string;
  audio: ScorecardAudioLike;
  consumerCount: number;
  autoplayAttempted: boolean;
};

let activeSession: ScorecardMusicSession | null = null;

function createScorecardAudio(): ScorecardAudioLike {
  if (typeof Audio === "undefined") {
    return {
      loop: false,
      volume: SCORECARD_MUSIC_VOLUME,
      muted: false,
      src: "",
      error: null,
      paused: true,
      pause: () => {},
      play: async () => {},
    };
  }
  const audio = new Audio();
  audio.preload = "auto";
  configureScorecardAudio(audio);
  return audio;
}

function disposeActiveSession(): void {
  if (!activeSession) return;
  disposeScorecardAudio(activeSession.audio);
  activeSession = null;
}

/**
 * Bind scorecard background music to the scorecard page lifecycle.
 * Returns cleanup — call on unmount / route leave.
 */
export function enterScorecardMusicSession(slug: string): () => void {
  if (
    !activeSession ||
    activeSession.slug !== slug
  ) {
    disposeActiveSession();
    activeSession = {
      slug,
      audio: createScorecardAudio(),
      consumerCount: 0,
      autoplayAttempted: false,
    };
  }

  const sessionAtEnter = activeSession;
  sessionAtEnter.consumerCount += 1;

  if (!sessionAtEnter.autoplayAttempted) {
    sessionAtEnter.autoplayAttempted = true;
    void attemptScorecardMusicPlayback(sessionAtEnter.audio);
  }

  return () => {
    if (activeSession !== sessionAtEnter) {
      return;
    }
    sessionAtEnter.consumerCount = Math.max(0, sessionAtEnter.consumerCount - 1);
    if (sessionAtEnter.consumerCount === 0) {
      disposeActiveSession();
    }
  };
}

/** Test-only reset for session singleton. */
export function resetScorecardMusicSessionForTests(): void {
  disposeActiveSession();
}

/** Test-only read of active session slug. */
export function getScorecardMusicSessionSlugForTests(): string | null {
  return activeSession?.slug ?? null;
}
