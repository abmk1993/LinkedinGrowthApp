import { describe, expect, it } from "vitest";
import { computePostingSchedule, describeDue, describeStreak } from "@/lib/growth/schedule";

// Local-time dates, matching how the dashboard calls this in the browser.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const NOW = at(2026, 9, 19, 10); // a Saturday

describe("computePostingSchedule", () => {
  it("makes the first post due today when nothing is published", () => {
    const s = computePostingSchedule("weekly", [], NOW);
    expect(s.daysUntilDue).toBe(0);
    expect(s.streak).toBe(0);
    expect(describeDue(s)).toBe("Your first post is due today");
    expect(describeStreak(s)).toBeNull();
  });

  it("counts days to the next post from the last one", () => {
    const s = computePostingSchedule("weekly", [at(2026, 9, 17)], NOW);
    expect(s.daysUntilDue).toBe(5);
    expect(describeDue(s)).toBe(`Due in 5 days (${at(2026, 9, 24).toLocaleDateString(undefined, { weekday: "long" })})`);
  });

  it("uses calendar days, so late-night and next-morning posts are one day apart", () => {
    const s = computePostingSchedule("daily", [at(2026, 9, 18, 23)], at(2026, 9, 19, 8));
    expect(s.daysUntilDue).toBe(0);
    expect(describeDue(s)).toBe("Due today");
  });

  it("reports overdue days and resets the streak", () => {
    const s = computePostingSchedule("few_times_week", [at(2026, 9, 14), at(2026, 9, 12)], NOW);
    expect(s.daysUntilDue).toBe(-3);
    expect(describeDue(s)).toBe("3 days overdue");
    expect(s.streak).toBe(0);
    expect(describeStreak(s)).toBe("Post today to get back on schedule.");
  });

  it("counts consecutive on-schedule posts until the first gap that's too long", () => {
    const published = [
      at(2026, 9, 18),
      at(2026, 9, 16), // 2-day gap: ok for few_times_week
      at(2026, 9, 14), // ok
      at(2026, 9, 5), // 9-day gap: breaks the streak
      at(2026, 9, 3),
    ];
    const s = computePostingSchedule("few_times_week", published, NOW);
    expect(s.daysUntilDue).toBe(1);
    expect(describeDue(s)).toBe("Due tomorrow");
    expect(s.streak).toBe(3);
    expect(describeStreak(s)).toBe("3 posts in a row on schedule.");
  });

  it("accepts ISO strings in any order", () => {
    const s = computePostingSchedule(
      "daily",
      [at(2026, 9, 17).toISOString(), at(2026, 9, 18).toISOString()],
      NOW
    );
    expect(s.lastPublished?.getDate()).toBe(18);
    expect(s.streak).toBe(2);
  });
});
