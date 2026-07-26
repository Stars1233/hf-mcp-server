interface BrowserToolConfig {
	name: string;
	description: string;
	annotations: {
		title: string;
		destructiveHint: boolean;
		readOnlyHint: boolean;
		openWorldHint: boolean;
	};
}

export const REPO_SEARCH_TOOL_CONFIG: BrowserToolConfig = {
	name: 'hub_repo_search',
	description:
		'Search Hugging Face repositories with a shared query interface. ' +
		'You can target models, datasets, spaces, or aggregate across multiple repo types in one call. ' +
		'Include links to repositories in your response.',
	annotations: {
		title: 'Repo Search',
		destructiveHint: false,
		readOnlyHint: true,
		openWorldHint: true,
	},
};

export const CREATE_REPO_TOOL_CONFIG: BrowserToolConfig = {
	name: 'create_repo',
	description:
		'Create a Hugging Face model, dataset, Space, or bucket repository using hf:// URIs. ' +
		'Use uri like hf://models/username/repo-name. Set source_uri to duplicate an existing model, dataset, or Space.',
	annotations: {
		title: 'Create Hugging Face Repository',
		destructiveHint: false,
		readOnlyHint: false,
		openWorldHint: true,
	},
};

export const HUB_REPO_DETAILS_TOOL_CONFIG: BrowserToolConfig = {
	name: 'hub_repo_details',
	description:
		'Get details for one or more Hugging Face repos (model, dataset, or space). ' +
		'Auto-detects type unless specified. For datasets, use dataset_structure first to discover configs, splits, ' +
		'sizes, and schema. Use dataset_preview only when config and split are known, unless the dataset has a single config/split.',
	annotations: {
		title: 'Hub Repo Details',
		destructiveHint: false,
		readOnlyHint: true,
		openWorldHint: false,
	},
};

export const HF_FS_TOOL_CONFIG: BrowserToolConfig = {
	name: 'hf_fs',
	description:
		'Navigate Hugging Face resources with ls, cat, find, stat, and search over hf:// URIs. ' +
		'Roots: hf://models, hf://datasets, hf://spaces, hf://buckets, hf://collections, hf://papers, hf://docs. ' +
		'Documentation paths come from each product’s current llms.txt manifest.',
	annotations: {
		title: 'Hugging Face Filesystem',
		destructiveHint: false,
		readOnlyHint: true,
		openWorldHint: true,
	},
};

export const REPO_SEARCH_TOOL_ID = REPO_SEARCH_TOOL_CONFIG.name;
export const CREATE_REPO_TOOL_ID = CREATE_REPO_TOOL_CONFIG.name;
export const HUB_REPO_DETAILS_TOOL_ID = HUB_REPO_DETAILS_TOOL_CONFIG.name;
export const HF_FS_TOOL_ID = HF_FS_TOOL_CONFIG.name;
export const HF_NAV_TOOL_ID = 'hf_nav';
export const HF_FILES_FLAG = 'hf_files' as const;
export const HF_JOBS_TOOL_ID = 'hf_jobs';
export const HF_SANDBOX_TOOL_ID = 'hf_sandbox';
export const HF_SANDBOX_EXEC_TOOL_ID = 'hf_sandbox_exec';
export const HF_SANDBOX_FS_TOOL_ID = 'hf_sandbox_fs';
export const DYNAMIC_SPACE_TOOL_ID = 'dynamic_space';

export const ALL_BUILTIN_TOOL_IDS = [
	REPO_SEARCH_TOOL_ID,
	CREATE_REPO_TOOL_ID,
	HUB_REPO_DETAILS_TOOL_ID,
	HF_FS_TOOL_ID,
	HF_JOBS_TOOL_ID,
	DYNAMIC_SPACE_TOOL_ID,
] as const;

export const TOOL_ID_GROUPS = {
	search: [REPO_SEARCH_TOOL_ID] as const,
	spaces: [
		REPO_SEARCH_TOOL_ID,
		CREATE_REPO_TOOL_ID,
		HUB_REPO_DETAILS_TOOL_ID,
		HF_FS_TOOL_ID,
		DYNAMIC_SPACE_TOOL_ID,
	] as const,
	detail: [HUB_REPO_DETAILS_TOOL_ID] as const,
	docs: [HF_FS_TOOL_ID] as const,
	hf_api: [REPO_SEARCH_TOOL_ID, CREATE_REPO_TOOL_ID, HUB_REPO_DETAILS_TOOL_ID, HF_FS_TOOL_ID] as const,
	dynamic_space: [DYNAMIC_SPACE_TOOL_ID] as const,
	all: [...ALL_BUILTIN_TOOL_IDS] as const,
	sandbox: [HF_SANDBOX_TOOL_ID, HF_SANDBOX_EXEC_TOOL_ID, HF_SANDBOX_FS_TOOL_ID] as const,
} as const;

export type BuiltinToolId = (typeof ALL_BUILTIN_TOOL_IDS)[number];

export function isValidBuiltinToolId(toolId: string): toolId is BuiltinToolId {
	return (ALL_BUILTIN_TOOL_IDS as readonly string[]).includes(toolId);
}
