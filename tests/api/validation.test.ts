import { describe, expect, it } from "vitest";
import {
  UpsertProfileRequestSchema,
  ProfileAuditRequestSchema,
  GrowthPlanRequestSchema,
} from "@/lib/validation/requests";
import { QA_PROFILE } from "../fixtures/profiles";

/**
 * These validate the request-shape contracts each route depends on
 * before touching the database or the AI provider — the cheapest layer
 * to catch a malformed client request. Full request/response tests
 * against a real route handler need a running Next.js request context
 * and a test Supabase instance (see docs/dev-plan.md section 8, layer 2)
 * — set up as part of task 1 in the dev task list, not duplicated here.
 */

describe("UpsertProfileRequestSchema", () => {
  it("accepts a valid profile payload", () => {
    const result = UpsertProfileRequestSchema.safeParse(QA_PROFILE);
    expect(result.success).toBe(true);
  });

  it("rejects a profile with no skills", () => {
    const result = UpsertProfileRequestSchema.safeParse({
      ...QA_PROFILE,
      skills: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a profile missing a required field", () => {
    const { profession: _profession, ...rest } = QA_PROFILE;
    const result = UpsertProfileRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("ProfileAuditRequestSchema", () => {
  it("accepts a payload with only a headline", () => {
    const result = ProfileAuditRequestSchema.safeParse({ headline: "QA lead" });
    expect(result.success).toBe(true);
  });

  it("rejects a payload with no sections at all", () => {
    const result = ProfileAuditRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("GrowthPlanRequestSchema", () => {
  it("accepts each valid cadence value", () => {
    for (const cadence of ["daily", "few_times_week", "weekly"] as const) {
      expect(GrowthPlanRequestSchema.safeParse({ cadence }).success).toBe(true);
    }
  });

  it("rejects an invalid cadence value", () => {
    const result = GrowthPlanRequestSchema.safeParse({ cadence: "hourly" });
    expect(result.success).toBe(false);
  });
});
