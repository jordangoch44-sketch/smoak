import assert from "node:assert/strict";
import test from "node:test";
import {
  billingHandoffNextPath,
  parseBillingHandoffIntent,
  readAppBillingLaunch,
  withoutAppBillingLaunch,
} from "@/lib/billing-app-handoff";

test("parse keeps Pro and PRO+ and rejects anything else", () => {
  assert.deepEqual(parseBillingHandoffIntent({ kind: "upgrade", product: "premium" }), {
    kind: "upgrade",
    product: "premium",
  });
  assert.equal(
    parseBillingHandoffIntent({ kind: "upgrade", product: "boosted_profile" }),
    null
  );
  assert.deepEqual(parseBillingHandoffIntent({ kind: "billing" }), { kind: "billing" });
});

test("parse clamps a boost into the allowed budget", () => {
  assert.deepEqual(
    parseBillingHandoffIntent({ kind: "boost", days: 99, dailyCents: 10 }),
    { kind: "boost", days: 30, dailyCents: 500 }
  );
});

test("next path points at the checkout they started", () => {
  assert.equal(
    billingHandoffNextPath({ kind: "upgrade", product: "platinum" }),
    "/specialist-dashboard?promo=pro&plan=platinum"
  );
  assert.equal(
    billingHandoffNextPath({ kind: "boost", days: 7, dailyCents: 1000 }),
    "/specialist-dashboard?promo=boost&days=7&daily=1000"
  );
  assert.equal(
    billingHandoffNextPath({ kind: "billing" }),
    "/specialist-dashboard?billing=manage"
  );
});

test("email promo links are not treated as an app handoff", () => {
  assert.equal(readAppBillingLaunch(new URLSearchParams("promo=pro")), null);
  assert.equal(readAppBillingLaunch(new URLSearchParams("promo=boost")), null);
  assert.deepEqual(
    readAppBillingLaunch(new URLSearchParams("promo=pro&plan=premium")),
    { kind: "upgrade", product: "premium" }
  );
});

test("stripping the handoff keeps unrelated dashboard params", () => {
  const next = withoutAppBillingLaunch(
    new URLSearchParams("tab=profile&promo=pro&plan=platinum&billing=success")
  );
  assert.equal(next.get("tab"), "profile");
  assert.equal(next.get("promo"), null);
  assert.equal(next.get("plan"), null);
  assert.equal(next.get("billing"), "success");
});
