export type Cadence = "daily" | "few_times_week" | "weekly";

/** Days allowed between posts. "A few times a week" ≈ 3 a week, so every other day. */
export const CADENCE_INTERVAL_DAYS: Record<Cadence, number> = {
  daily: 1,
  few_times_week: 2,
  weekly: 7,
};

export interface PostingSchedule {
  /**
   * Calendar days until the next post is due: 0 = today (also when
   * nothing has been published yet), negative = that many days overdue.
   */
  daysUntilDue: number;
  dueDate: Date;
  lastPublished: Date | null;
  /** Consecutive published posts, newest first, each within the cadence of the next — 0 while overdue. */
  streak: number;
}

/**
 * Local calendar-day index, so a post at 23:00 and one at 08:00 the next
 * morning are one day apart — "did I post on schedule" is about the
 * user's own days, not 24-hour windows or UTC dates.
 */
function dayIndex(date: Date): number {
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
}

function dateFromDayIndex(index: number): Date {
  const utc = new Date(index * 86_400_000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

export function computePostingSchedule(
  cadence: Cadence,
  publishedAt: Array<string | Date>,
  now: Date = new Date()
): PostingSchedule {
  const interval = CADENCE_INTERVAL_DAYS[cadence];
  const today = dayIndex(now);

  const dates = publishedAt
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  const last = dates[0];
  if (!last) {
    return { daysUntilDue: 0, dueDate: dateFromDayIndex(today), lastPublished: null, streak: 0 };
  }

  const dueDay = dayIndex(last) + interval;
  const daysUntilDue = dueDay - today;

  let streak = 0;
  if (daysUntilDue >= 0) {
    streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const gap = dayIndex(dates[i] as Date) - dayIndex(dates[i + 1] as Date);
      if (gap > interval) break;
      streak++;
    }
  }

  return { daysUntilDue, dueDate: dateFromDayIndex(dueDay), lastPublished: last, streak };
}

export function describeDue(schedule: PostingSchedule): string {
  const { daysUntilDue, lastPublished, dueDate } = schedule;
  if (!lastPublished) return "Your first post is due today";
  if (daysUntilDue < 0) {
    const days = -daysUntilDue;
    return `${days} ${days === 1 ? "day" : "days"} overdue`;
  }
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  const weekday = dueDate.toLocaleDateString(undefined, { weekday: "long" });
  return `Due in ${daysUntilDue} days (${weekday})`;
}

export function describeStreak(schedule: PostingSchedule): string | null {
  if (!schedule.lastPublished) return null;
  if (schedule.streak === 0) return "Post today to get back on schedule.";
  if (schedule.streak === 1) return "Your last post was on schedule.";
  return `${schedule.streak} posts in a row on schedule.`;
}
