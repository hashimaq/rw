import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      walk(p, acc);
    } else if (/\.(tsx|ts|jsx|js)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

describe("internal navigation hygiene", () => {
  it("does not use full-page reload helpers in app source", () => {
    const files = walk(SRC);
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (/window\.location\.reload|location\.reload\(\)/.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("avoids raw internal <a href=\"/...\"> without Link in components", () => {
    const files = walk(join(SRC, "components")).filter(
      (f) => f.endsWith(".tsx") && !f.includes(".test."),
    );
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (/<a\s+[^>]*href=["']\/(?!\/)/.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
