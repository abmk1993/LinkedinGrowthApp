import { z } from "zod";

export const UpsertProfileRequestSchema = z.object({
  profession: z.string().min(1).max(200),
  industry: z.string().min(1).max(200),
  experienceLevel: z.string().min(1).max(100),
  careerGoal: z.string().min(1).max(1000),
  skills: z.array(z.string().min(1).max(100)).min(1).max(30),
  interests: z.array(z.string().min(1).max(100)).max(30),
});
export type UpsertProfileRequest = z.infer<typeof UpsertProfileRequestSchema>;

export const ProfileAuditRequestSchema = z
  .object({
    headline: z.string().max(2000).optional(),
    about: z.string().max(5000).optional(),
    experience: z.string().max(5000).optional(),
  })
  .refine((data) => data.headline || data.about || data.experience, {
    message: "At least one of headline, about, or experience must be provided",
  });
export type ProfileAuditRequest = z.infer<typeof ProfileAuditRequestSchema>;

export const GrowthPlanRequestSchema = z.object({
  cadence: z.enum(["daily", "few_times_week", "weekly"]),
});
export type GrowthPlanRequest = z.infer<typeof GrowthPlanRequestSchema>;

export const GeneratePostRequestSchema = z.object({
  researchItemId: z.string().uuid(),
});
export type GeneratePostRequest = z.infer<typeof GeneratePostRequestSchema>;

export const RegeneratePostRequestSchema = z.object({
  modifier: z.union([
    z.enum(["shorten", "more_technical", "more_personal", "more_educational"]),
    z.object({ changeTone: z.string().min(1) }),
  ]),
});
export type RegeneratePostRequest = z.infer<typeof RegeneratePostRequestSchema>;
