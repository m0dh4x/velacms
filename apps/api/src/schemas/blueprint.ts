import { z } from 'zod';
export const fieldTypes = [
	'text',
	'richtext',
	'number',
	'boolean',
	'date',
	'datetime',
	'asset',
	'reference',
	'select',
	'link',
] as const;

const baseFieldSchema = z.object({
	name: z
		.string()
		.min(1)
		.regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
	type: z.enum(fieldTypes),
	label: z.string().optional(),
	description: z.string().optional(),
	required: z.boolean().default(false),
	localized: z.boolean().default(false),
	defaultValue: z.unknown().optional(),
});

const textFieldSchema = baseFieldSchema.extend({
	type: z.literal('text'),
	options: z
		.object({
			minLength: z.number().int().min(0).optional(),
			maxLength: z.number().int().min(1).optional(),
			pattern: z.string().optional(),
		})
		.optional(),
});

const richtextFieldSchema = baseFieldSchema.extend({
	type: z.literal('richtext'),
	options: z
		.object({
			allowedBlocks: z.array(z.string()).optional(),
		})
		.optional(),
});

const numberFieldSchema = baseFieldSchema.extend({
	type: z.literal('number'),
	options: z
		.object({
			min: z.number().optional(),
			max: z.number().optional(),
			step: z.number().optional(),
			integer: z.boolean().optional(),
		})
		.optional(),
});

const booleanFieldSchema = baseFieldSchema.extend({
	type: z.literal('boolean'),
});

const dateFieldSchema = baseFieldSchema.extend({
	type: z.literal('date'),
});

const datetimeFieldSchema = baseFieldSchema.extend({
	type: z.literal('datetime'),
});

const assetFieldSchema = baseFieldSchema.extend({
	type: z.literal('asset'),
	options: z
		.object({
			allowedMimeTypes: z.array(z.string()).optional(),
			maxSize: z.number().int().optional(),
		})
		.optional(),
});

const referenceFieldSchema = baseFieldSchema.extend({
	type: z.literal('reference'),
	options: z.object({
		blueprints: z.array(z.string()).min(1, 'At least one blueprint must be specified'),
		multiple: z.boolean().default(false),
	}),
});

const selectFieldSchema = baseFieldSchema.extend({
	type: z.literal('select'),
	options: z.object({
		choices: z
			.array(z.object({ value: z.string(), label: z.string() }))
			.min(1, 'At least one choice is required'),
		multiple: z.boolean().default(false),
	}),
});

const linkFieldSchema = baseFieldSchema.extend({
	type: z.literal('link'),
	options: z
		.object({
			allowedProtocols: z.array(z.string()).optional(),
		})
		.optional(),
});

export const fieldSchema = z.discriminatedUnion('type', [
	textFieldSchema,
	richtextFieldSchema,
	numberFieldSchema,
	booleanFieldSchema,
	dateFieldSchema,
	datetimeFieldSchema,
	assetFieldSchema,
	referenceFieldSchema,
	selectFieldSchema,
	linkFieldSchema,
]);

export const blueprintSettingsSchema = z
	.object({
		singleton: z.boolean().optional(),
		titleField: z.string().optional(),
		slugField: z.string().optional(),
		previewUrl: z.string().url().optional(),
		workflowId: z.string().optional(),
	})
	.optional();

export const createBlueprintSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	slug: z
		.string()
		.min(1, 'Slug is required')
		.max(50)
		.regex(
			/^[a-z][a-z0-9-]*$/,
			'Slug must start with letter, lowercase alphanumeric and hyphens only',
		),
	description: z.string().max(500).optional(),
	icon: z.string().max(50).optional(),
	type: z.enum(['fragment', 'entity']),
	schema: z.object({
		fields: z.array(fieldSchema).min(1, 'At least one field is required'),
	}),
	settings: blueprintSettingsSchema,
});

export const updateBlueprintSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	icon: z.string().max(50).optional(),
	schema: z
		.object({
			fields: z.array(fieldSchema).min(1, 'At least one field is required'),
		})
		.optional(),
	settings: blueprintSettingsSchema,
});

export type CreateBlueprintInput = z.infer<typeof createBlueprintSchema>;
export type UpdateBlueprintInput = z.infer<typeof updateBlueprintSchema>;
export type Field = z.infer<typeof fieldSchema>;
export type BlueprintSettings = z.infer<typeof blueprintSettingsSchema>;
