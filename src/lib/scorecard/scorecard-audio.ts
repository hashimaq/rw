import {
  SCORECARD_MUSIC_SRC,
  SCORECARD_MUSIC_VOLUME,
} from "@/lib/scorecard/scorecard-music-config";

export interface ScorecardAudioLike {
  loop: boolean;
  volume: number;
  muted: boolean;
  src: string;
  pause: () => void;
  play: () => Promise<void>;
}

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
