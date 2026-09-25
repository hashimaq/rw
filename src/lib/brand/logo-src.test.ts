import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { BRAND_LOGO_SRC } from "@/lib/brand/logo-src";
import { LOGO_SRC } from "@/components/branding/red-wings-logo";

describe("brand logo", () => {
  it("uses the official public brand asset everywhere", () => {
    expect(BRAND_LOGO_SRC).toBe("/brand/rwings.jpg");
    expect(LOGO_SRC).toBe(BRAND_LOGO_SRC);
  });

  it("keeps Next app icons in sync with public brand file", () => {
    const publicLogo = readFileSync(
      join(process.cwd(), "public/brand/rwings.jpg"),
    );
    const appIcon = readFileSync(join(process.cwd(), "src/app/icon.jpg"));
    expect(appIcon.length).toBe(publicLogo.length);
  });
});
