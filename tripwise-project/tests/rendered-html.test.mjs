import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the Tripwise workspace in Chinese", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Tripwise — 旅行准备管理器<\/title>/);
  assert.match(html, />旅行总览</);
  assert.match(html, />旅行计划</);
  assert.match(html, />每日视图</);
  assert.match(html, />行前准备</);
  assert.match(html, /旅行计划二维表/);
  assert.match(html, /计划工作台/);
});

test("pre-launch data boundaries and persistence hooks stay intact", async () => {
  const [page, preparation, workspace, daily, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/preparation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TravelWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/DailyView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const checklistEntries = preparation.match(/^\s*item\("/gm) ?? [];
  assert.equal(checklistEntries.length, 16);
  assert.match(page, /tripwise-trips-v2/);
  assert.match(page, /tripwise-current-trip-id-v2/);
  assert.match(page, /setTrips\(currentTrips => \[\.\.\.currentTrips, nextTrip\]\)/);
  assert.match(page, /currentTrips\.map\(trip => trip\.id === tripId/);
  assert.match(page, /workspaceData: createEmptyWorkspaceData\(\)/);
  assert.match(page, /id: "demo-tokyo"/);
  assert.match(workspace, /simple-item-delete/);
  assert.match(daily, /dailyExtras:\s*\[\.\.\.data\.dailyExtras/);
  assert.match(css, /\.mobile-nav\{grid-template-columns:repeat\(5,1fr\)\}/);
});
