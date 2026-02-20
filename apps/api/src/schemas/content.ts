import { z } from 'zod';

export const createContentSchema = z.object({
	blueprintId: z.string().min(1, 'Blueprint ID is required'),
	slug: z
		.string()
		.min(1, 'Slug is required')
		.max(200)
		.regex(
			/^[a-z][a-z0-9-]*$/,
			'Slug must start with letter, lowercase alphanumeric and hyphens only',
		),
	title: z.string().min(1, 'Title is required').max(300),
	data: z.record(z.string(), z.unknown()),
	locale: z.string().min(2).max(10).default('en'),
});

export const updateContentSchema = z.object({
	title: z.string().min(1).max(300).optional(),
	slug: z
		.string()
		.min(1)
		.max(200)
		.regex(/^[a-z][a-z0-9-]*$/)
		.optional(),
	data: z.record(z.string(), z.unknown()).optional(),
	workflowState: z.string().min(1).optional(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
