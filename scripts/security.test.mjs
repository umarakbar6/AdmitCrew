import assert from "node:assert/strict";
import test from "node:test";
import { authorizeStaff } from "../lib/staff-access.ts";
function fixture(bootstrapUserId) {
  const rows = new Map();
  return { rows, store: { read: async id => rows.get(id) ?? null, count: async () => rows.size, create: async row => rows.set(row.id, row), bootstrapUserId } };
}
const request = (id, email = "staff@example.com") => new Request("https://app.example", { headers: { ...(id ? { "oai-authenticated-user-id": id } : {}), "oai-authenticated-user-email": email } });
const blocked = status => error => error instanceof Response && error.status === status;
test("localhost and email-only requests cannot acquire staff identity", async () => {
  const { store, rows } = fixture();
  await assert.rejects(() => authorizeStaff(new Request("http://localhost"), ["admin"], store), blocked(401));
  await assert.rejects(() => authorizeStaff(request(), ["admin"], store), blocked(401));
  assert.equal(rows.size, 0);
});
test("an arbitrary first visitor cannot become administrator", async () => {
  const { store, rows } = fixture("designated-owner");
  await assert.rejects(() => authorizeStaff(request("other-user"), ["admin"], store), blocked(403));
  assert.equal(rows.size, 0);
  assert.equal((await authorizeStaff(request("designated-owner"), ["admin"], store)).role, "admin");
  await assert.rejects(() => authorizeStaff(request("other-user"), ["admin"], store), blocked(403));
  assert.equal(rows.size, 1);
});
test("stored staff roles prevent privilege escalation", async () => {
  const { store, rows } = fixture();
  rows.set("member", { id: "member", email: "member@example.com", name: "Member", role: "counselor" });
  assert.equal((await authorizeStaff(request("member"), ["counselor"], store)).role, "counselor");
  await assert.rejects(() => authorizeStaff(request("member"), ["admin"], store), blocked(403));
});
