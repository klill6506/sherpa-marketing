import { z } from "zod";

export const createOrgSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be under 100 characters"),
});

export const createPostSchema = z.object({
  caption: z
    .string()
    .min(1, "Caption is required")
    .max(5000, "Caption must be under 5000 characters"),
  hashtags: z.string().max(1000).optional().default(""),
  mediaAssetId: z.string().optional(),
  variants: z.array(
    z.object({
      provider: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK"]),
      enabled: z.boolean(),
      captionOverride: z.string().max(5000).optional(),
    })
  ),
  publishMode: z.enum(["now", "schedule", "draft"]),
  scheduledAt: z.string().optional(), // ISO date string
  timezone: z.string().optional().default("UTC"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
