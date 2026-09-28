import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const FORBIDDEN = ["red-wings-logo.jpg", "rw-logo.jpg"];

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(p, acc);
    } else {
      acc.push(p);
    }
  }
  return acc;
}

describe("legacy logo assets", () => {
  it("does not ship old logo files under public/", () => {
    const publicRoot = join(process.cwd(), "public");
    const files = walk(publicRoot).map((p) => p.replace(/\\/g, "/"));
    for (const forbidden of FORBIDDEN) {
      expect(files.some((f) => f.endsWith(forbidden))).toBe(false);
    }
  });

  it("service worker never caches /brand/ and does not cache home HTML", () => {
    const sw = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
    expect(sw).toContain("isBrandAsset");
    expect(sw).toContain('pathname.startsWith("/brand/")');
    expect(sw).not.toMatch(/pathname === "\/"/);
  });
});
