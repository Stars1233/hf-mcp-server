import { describe, it, expect } from 'vitest';
import { HF_FILES_FLAG, HF_FS_TOOL_ID, HF_NAV_TOOL_ID, REPO_SEARCH_TOOL_ID } from '@llmindset/hf-mcp';
import { normalizeBuiltInTools } from '../../src/shared/tool-normalizer.js';

describe('normalizeBuiltInTools', () => {
	it('deduplicates tool IDs while preserving order', () => {
		expect(normalizeBuiltInTools([REPO_SEARCH_TOOL_ID, HF_FS_TOOL_ID, REPO_SEARCH_TOOL_ID])).toEqual([
			REPO_SEARCH_TOOL_ID,
			HF_FS_TOOL_ID,
		]);
	});

	it('maps external hf_files flag to hf_fs tool id', () => {
		const result = normalizeBuiltInTools([HF_FILES_FLAG]);

		expect(result).toEqual([HF_FILES_FLAG, HF_FS_TOOL_ID]);
	});

	it('maps hub query API flags to hf_fs', () => {
		expect(normalizeBuiltInTools(['hf_hub_query'])).toEqual(['hf_hub_query', HF_FS_TOOL_ID]);
		expect(normalizeBuiltInTools(['hub_query'])).toEqual(['hub_query', HF_FS_TOOL_ID]);
	});

	it('maps retired hf_nav selections to hf_fs', () => {
		expect(normalizeBuiltInTools([HF_NAV_TOOL_ID])).toEqual([HF_FS_TOOL_ID]);
	});
});
