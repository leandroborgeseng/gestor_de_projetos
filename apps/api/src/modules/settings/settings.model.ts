import { z } from "zod";

export const UpdateSettingsSchema = z.object({
  emailHost: z.string().optional(),
  emailPort: z.number().int().min(1).max(65535).optional(),
  emailUser: z.string().optional(),
  emailPassword: z.string().optional(),
  emailFrom: z.string().email().optional(),
  emailFromName: z.string().optional(),
  maxFileSize: z.number().int().min(1).optional(), // em MB
  allowedFileTypes: z.array(z.string()).optional(),
});

export const UpdatePermissionSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
  resource: z.string().min(1),
  action: z.string().min(1),
  allowed: z.boolean(),
});

export const BulkUpdatePermissionsSchema = z.object({
  permissions: z.array(UpdatePermissionSchema),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type UpdatePermissionInput = z.infer<typeof UpdatePermissionSchema>;
export type BulkUpdatePermissionsInput = z.infer<typeof BulkUpdatePermissionsSchema>;

