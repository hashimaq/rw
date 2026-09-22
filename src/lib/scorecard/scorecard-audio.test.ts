import { describe, expect, it, vi } from "vitest";
import {
  configureScorecardAudio,
  disposeScorecardAudio,
} from "@/lib/scorecard/scorecard-audio";
import {
  SCORECARD_MUSIC_SRC,
  SCORECARD_MUSIC_VOLUME,
} from "@/lib/scorecard/scorecard-music-config";

describe("scorecard audio helpers", () => {
  it("configures loop, volume, and src", () => {
    const audio = {
      loop: false,
      volume: 1,
      muted: false,
      src: "",
      pause: vi.fn(),
      play: vi.fn(),
    };
    configureScorecardAudio(audio);
    expect(audio.loop).toBe(true);
    expect(audio.volume).toBe(SCORECARD_MUSIC_VOLUME);
    expect(audio.src).toBe(SCORECARD_MUSIC_SRC);
  });

  it("disposes audio on teardown", () => {
    const audio = {
      loop: true,
      volume: 0.5,
      muted: false,
      src: SCORECARD_MUSIC_SRC,
      pause: vi.fn(),
      play: vi.fn(),
    };
    disposeScorecardAudio(audio);
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.src).toBe("");
  });
});
