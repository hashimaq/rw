import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attemptScorecardMusicPlayback,
  configureScorecardAudio,
  disposeScorecardAudio,
  enterScorecardMusicSession,
  getScorecardMusicSessionSlugForTests,
  resetScorecardMusicSessionForTests,
} from "@/lib/scorecard/scorecard-audio";
import {
  SCORECARD_MUSIC_SRC,
  SCORECARD_MUSIC_VOLUME,
} from "@/lib/scorecard/scorecard-music-config";

describe("scorecard audio helpers", () => {
  afterEach(() => {
    resetScorecardMusicSessionForTests();
  });

  it("configures loop, volume, and src", () => {
    const audio = {
      loop: false,
      volume: 1,
      muted: false,
      src: "",
      error: null,
      paused: true,
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
      error: null,
      paused: true,
      pause: vi.fn(),
      play: vi.fn(),
    };
    disposeScorecardAudio(audio);
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.src).toBe("");
  });

  it("returns playing when already playing", async () => {
    const audio = {
      loop: true,
      volume: 0.5,
      muted: false,
      src: SCORECARD_MUSIC_SRC,
      error: null,
      paused: false,
      pause: vi.fn(),
      play: vi.fn(),
    };
    await expect(attemptScorecardMusicPlayback(audio)).resolves.toBe("playing");
    expect(audio.play).not.toHaveBeenCalled();
  });

  it("returns blocked when play() rejects", async () => {
    const audio = {
      loop: true,
      volume: 0.5,
      muted: false,
      src: SCORECARD_MUSIC_SRC,
      error: null,
      paused: true,
      pause: vi.fn(),
      play: vi.fn().mockRejectedValue(new Error("NotAllowedError")),
    };
    await expect(attemptScorecardMusicPlayback(audio)).resolves.toBe("blocked");
  });
});

describe("enterScorecardMusicSession", () => {
  const OriginalAudio = globalThis.Audio;

  afterEach(() => {
    resetScorecardMusicSessionForTests();
    globalThis.Audio = OriginalAudio;
  });

  it("reuses one session for nested mounts on the same slug", () => {
    const play = vi.fn().mockResolvedValue(undefined);
    globalThis.Audio = vi.fn().mockImplementation(() => ({
      preload: "",
      loop: false,
      volume: 1,
      muted: false,
      src: "",
      error: null,
      paused: true,
      pause: vi.fn(),
      play,
    })) as unknown as typeof Audio;

    const leaveOuter = enterScorecardMusicSession("match-a");
    const leaveInner = enterScorecardMusicSession("match-a");

    expect(getScorecardMusicSessionSlugForTests()).toBe("match-a");
    expect(play).toHaveBeenCalledTimes(1);

    leaveInner();
    expect(getScorecardMusicSessionSlugForTests()).toBe("match-a");

    leaveOuter();
    expect(getScorecardMusicSessionSlugForTests()).toBe(null);
  });

  it("does not restart autoplay when re-entering same slug after cleanup", () => {
    const play = vi.fn().mockResolvedValue(undefined);
    globalThis.Audio = vi.fn().mockImplementation(() => ({
      preload: "",
      loop: false,
      volume: 1,
      muted: false,
      src: "",
      error: null,
      paused: true,
      pause: vi.fn(),
      play,
    })) as unknown as typeof Audio;

    const leave1 = enterScorecardMusicSession("match-a");
    leave1();
    const leave2 = enterScorecardMusicSession("match-a");
    expect(play).toHaveBeenCalledTimes(2);
    leave2();
  });

  it("starts a new session when navigating to another scorecard slug", () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    globalThis.Audio = vi.fn().mockImplementation(() => ({
      preload: "",
      loop: false,
      volume: 1,
      muted: false,
      src: "",
      error: null,
      paused: true,
      pause,
      play,
    })) as unknown as typeof Audio;

    const leaveA = enterScorecardMusicSession("slug-a");
    leaveA();
    const leaveB = enterScorecardMusicSession("slug-b");
    expect(getScorecardMusicSessionSlugForTests()).toBe("slug-b");
    expect(play).toHaveBeenCalledTimes(2);
    leaveB();
    expect(getScorecardMusicSessionSlugForTests()).toBe(null);
    expect(pause).toHaveBeenCalled();
  });
});
