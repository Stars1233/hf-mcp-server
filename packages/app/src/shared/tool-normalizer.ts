import { HF_FILES_FLAG, HF_FS_TOOL_ID, HF_NAV_TOOL_ID } from '@llmindset/hf-mcp';

const HUB_QUERY_FLAGS = new Set(['hf_hub_query', 'hub_query']);

/**
 * Normalizes built-in tool lists coming from UI/API clients.
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

		if (HUB_QUERY_FLAGS.has(rawId)) {
			for (const id of [rawId, HF_FS_TOOL_ID]) {
				if (!seen.has(id)) {
					seen.add(id);
					normalized.push(id);
				}
			}
			continue;
		}

		const canonicalToolId = rawId === HF_NAV_TOOL_ID ? HF_FS_TOOL_ID : rawId;

		if (!seen.has(canonicalToolId)) {
			seen.add(canonicalToolId);
			normalized.push(canonicalToolId);
		}
	}

	return normalized;
}
