import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCivilDate, updateCivilDate, updateCivilTime } from "../lib/civil-date";

test("选择日期时保留原有店铺本地时间和秒数", () => {
  const date = new Date(2026, 10, 13, 12);
  assert.equal(updateCivilDate("2026-11-12T23:06:47", date), "2026-11-13T23:06:47");
  assert.equal(updateCivilTime("2026-11-13T23:06:47", "08:10:11"), "2026-11-13T08:10:11");
});
test("空时间选择日期得到明确的本地零点，不能单独输入时间", () => {
  assert.equal(updateCivilDate("", new Date(2026, 10, 13, 12)), "2026-11-13T00:00:00");
  assert.equal(updateCivilTime("", "08:10:11"), "");
  assert.equal(parseCivilDate("2026-02-30T08:00:00"), undefined);
  const parsed = parseCivilDate("2026-11-13T23:06:47");
  assert.equal(parsed?.getFullYear(), 2026);
  assert.equal(parsed?.getMonth(), 10);
  assert.equal(parsed?.getDate(), 13);
});
