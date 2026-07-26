import { HF_FILES_FLAG, HF_FS_TOOL_ID } from '@llmindset/hf-mcp';

/**
 * Normalizes tool lists coming from the per-user configuration API.
 * - Deduplicates entries while preserving original order where possible.
 */
export function normalizeBuiltInTools(ids: readonly string[]): string[] {
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const rawId of ids) {
		if (rawId === HF_FILES_FLAG) {
			for (const id of [HF_FILES_FLAG, HF_FS_TOOL_ID]) {
				if (!seen.has(id)) {
					seen.add(id);
					normalized.push(id);
				}
			}
			continue;
		}

		if (!seen.has(rawId)) {
			seen.add(rawId);
			normalized.push(rawId);
		}
	}

	return normalized;
}
