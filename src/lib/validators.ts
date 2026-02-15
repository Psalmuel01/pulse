import { z } from "zod";

export const createCreatorSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  description: z.string().trim().min(8).max(220),
  category: z.string().min(2).max(40),
  subscriptionFee: z.coerce.number().positive(),
  txHash: z.string().optional()
});

export const updateSubscriptionFeeSchema = z.object({
  subscriptionFee: z.coerce.number().positive(),
  txHash: z.string().optional()
});

export const subscribeSchema = z.object({
  creatorId: z.string().min(1),
  txHash: z.string().min(1)
});

export const unlockSchema = z.object({
  contentId: z.string().min(1),
  txHash: z.string().optional()
});

export const createContentSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(400).optional(),
  type: z.enum(["ARTICLE", "VIDEO", "MUSIC"]),
  price: z.coerce.number().nonnegative(),
  onlyForSubscribers: z.boolean().default(false),
  storagePath: z.string().min(1).optional(),
  articleBody: z.string().trim().min(1).max(20000).optional(),
  thumbnailPath: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.type === "ARTICLE") {
    if (!data.storagePath && !data.articleBody) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["articleBody"],
        message: "Article content is required."
      });
    }
    return;
  }

  if (!data.storagePath) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storagePath"],
      message: "Uploaded media file is required for video/music content."
    });
  }
});

export const createUploadUrlSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1)
});

export const withdrawEarningsSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  txHash: z.string().optional()
});
