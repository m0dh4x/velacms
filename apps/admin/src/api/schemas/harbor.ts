import { z } from 'zod';

export const HarborSchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	settings: z.string(),
	organizationId: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const harborListSchema = z.array(HarborSchema);

export type Harbor = z.infer<typeof HarborSchema>;
