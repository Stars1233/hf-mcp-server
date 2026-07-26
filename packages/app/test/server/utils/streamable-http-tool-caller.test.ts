import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

const mocks = vi.hoisted(() => ({
	connect: vi.fn(),
	request: vi.fn(),
	close: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
	Client: class {
		connect = mocks.connect;
		request = mocks.request;
		close = mocks.close;
	},
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
	StreamableHTTPClientTransport: class {},
}));

vi.mock('@llmindset/hf-mcp/network', () => ({
	NETWORK_FETCH_PROFILES: {
		streamableProxy: () => ({ urlPolicy: {} }),
	},
	parseAndValidateUrl: (url: string) => new URL(url),
	fetchWithProfile: vi.fn(),
}));

vi.mock('../../../src/server/utils/logger.js', () => ({
	logger: {
		trace: vi.fn(),
		info: vi.fn(),
	},
}));

import { callStreamableHttpTool } from '../../../src/server/utils/streamable-http-tool-caller.js';

describe('callStreamableHttpTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.request.mockResolvedValue({ content: [], isError: false });
	});

	it('requests upstream progress and resets the timeout when progress arrives', async () => {
		await callStreamableHttpTool('https://example.com/mcp', 'csv_tool', {}, undefined);

		expect(mocks.request).toHaveBeenCalledWith(
			{
				method: 'tools/call',
				params: {
					name: 'csv_tool',
					arguments: {},
					_meta: { progressToken: 'hf-mcp-server' },
				},
			},
			CallToolResultSchema,
			expect.objectContaining({
				onprogress: expect.any(Function),
				resetTimeoutOnProgress: true,
			})
		);
		expect(mocks.close).toHaveBeenCalledOnce();
	});
});
