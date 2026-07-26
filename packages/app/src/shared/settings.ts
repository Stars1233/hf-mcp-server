import { ALL_BUILTIN_TOOL_IDS } from '@llmindset/hf-mcp';
import { normalizeBuiltInTools } from './tool-normalizer.js';

// Define the settings types
export interface SpaceTool {
	_id: string;
	name: string;
	subdomain: string;
	emoji: string;
}

export interface AppSettings {
	builtInTools: string[];
	spaceTools: SpaceTool[];
}

// Default space tools (exported for reuse)
export const DEFAULT_SPACE_TOOLS: SpaceTool[] = [
	{
		_id: '6931936f57adaf3524388f9c',
		name: 'mcp-tools/Z-Image-Turbo',
		subdomain: 'mcp-tools-z-image-turbo',
		emoji: '🖼️',
	},

	// {
	// 	_id: '69147d8b8dc517cb9b2d313f',
	// 	name: 'mcp-tools/Qwen-Image-Fast',
	// 	subdomain: 'mcp-tools-qwen-image-fast',
	// 	emoji: '🖼️',
	// },
	// {
	// 	_id: '6755d0d9e0ea01e11fa2a38a',
	// 	name: 'evalstate/flux1_schnell',
	// 	subdomain: 'evalstate-flux1-schnell',
	// 	emoji: '🏎️💨',
	// },
	/*
	{
		_id: '680be03dc38b7fa7d6855910',
		name: 'abidlabs/EasyGhibli',
		subdomain: 'abidlabs-easyghibli',
		emoji: '🦀',
	},
	*/
];

/**
 * Immutable settings used when no per-user configuration API is configured.
 */
export const DEFAULT_SETTINGS: AppSettings = {
	builtInTools: normalizeBuiltInTools([...ALL_BUILTIN_TOOL_IDS]),
	spaceTools: [...DEFAULT_SPACE_TOOLS],
};
