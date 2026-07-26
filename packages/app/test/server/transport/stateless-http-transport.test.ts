/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	MAX_METRICS_RESPONSE_CAPTURE_BYTES,
	MetricsResponseCapture,
	StatelessHttpTransport,
} from '../../../src/server/transport/stateless-http-transport.js';
import type { ServerFactory } from '../../../src/server/transport/base-transport.js';
import { formatMetricsForAPI } from '../../../src/shared/transport-metrics.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express from 'express';
import { createProgressRelay } from '../../../src/server/utils/progress-relay.js';

describe('MetricsResponseCapture', () => {
	it('detects JSON-RPC and tool errors in bounded responses', () => {
		const rpcError = new MetricsResponseCapture();
		rpcError.add('{"jsonrpc":"2.0","id":1,');
		rpcError.add('"error":{"code":-32603,"message":"failed"}}');
		expect(rpcError.isError()).toBe(true);

		const toolError = new MetricsResponseCapture();
		toolError.add(
			Buffer.from(
				'{"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"contains data: text"}],"isError":true}}'
			)
		);
		expect(toolError.isError()).toBe(true);

		const sseToolError = new MetricsResponseCapture();
		sseToolError.add(
			'event: message\n' +
				'data: {"jsonrpc":"2.0","method":"notifications/progress","params":{"progressToken":"token","progress":1}}\n\n' +
				'event: message\n' +
				'data: {"jsonrpc":"2.0","id":1,"result":{"content":[],"isError":true}}\n\n'
		);
		expect(sseToolError.isError()).toBe(true);
	});

	it('does not concatenate or parse responses larger than the capture limit', () => {
		const capture = new MetricsResponseCapture();
		capture.add(Buffer.alloc(MAX_METRICS_RESPONSE_CAPTURE_BYTES + 1, 'x'));
		const concatSpy = vi.spyOn(Buffer, 'concat');

		expect(capture.isError()).toBe(false);
		expect(concatSpy).not.toHaveBeenCalled();

		concatSpy.mockRestore();
	});
});

describe('StatelessHttpTransport', () => {
	let transport: StatelessHttpTransport;
	const originalAnalyticsMode = process.env.ANALYTICS_MODE;
	const originalDisableTools = process.env.DISABLE_TOOLS;

	beforeEach(() => {
		if (originalAnalyticsMode === undefined) {
			delete process.env.ANALYTICS_MODE;
		} else {
			process.env.ANALYTICS_MODE = originalAnalyticsMode;
		}
		if (originalDisableTools === undefined) {
			delete process.env.DISABLE_TOOLS;
		} else {
			process.env.DISABLE_TOOLS = originalDisableTools;
		}
		// Create a minimal instance for testing private methods
		const mockServerFactory = vi.fn() as unknown as ServerFactory;
		const mockApp = express();
		transport = new StatelessHttpTransport(mockServerFactory, mockApp);
	});

	afterEach(() => {
		if (originalAnalyticsMode === undefined) {
			delete process.env.ANALYTICS_MODE;
		} else {
			process.env.ANALYTICS_MODE = originalAnalyticsMode;
		}
		if (originalDisableTools === undefined) {
			delete process.env.DISABLE_TOOLS;
		} else {
			process.env.DISABLE_TOOLS = originalDisableTools;
		}
	});

	describe('shouldHandle', () => {
		it('should handle tools/list requests', () => {
			const result = (transport as any).shouldHandle({ method: 'tools/list' });
			expect(result).toBe(true);
		});

		it('should handle tools/call requests', () => {
			const result = (transport as any).shouldHandle({ method: 'tools/call' });
			expect(result).toBe(true);
		});

		it('should handle initialize requests', () => {
			const result = (transport as any).shouldHandle({ method: 'initialize' });
			expect(result).toBe(true);
		});

		it('should not handle ping requests', () => {
			const result = (transport as any).shouldHandle({ method: 'ping' });
			expect(result).toBe(false);
		});

		it('should reject prompts/list through the stub responder', () => {
			const result = (transport as any).shouldHandle({ method: 'prompts/list' });
			expect(result).toBe(false);
		});

		it('should reject prompts/get through the stub responder', () => {
			const result = (transport as any).shouldHandle({ method: 'prompts/get' });
			expect(result).toBe(false);
		});

		it('should retain prompt attempt names for metrics', () => {
			expect((transport as any).extractMethodForTracking({ method: 'prompts/list' })).toBe('prompts/list');
			expect(
				(transport as any).extractMethodForTracking({
					method: 'prompts/get',
					params: { name: 'Retired Prompt' },
				})
			).toBe('prompts/get:Retired Prompt');
		});

		it('should handle resources/list requests for non-openai-mcp clients', () => {
			const result = (transport as any).shouldHandle({ method: 'resources/list' });
			expect(result).toBe(true);
		});

		it('should handle resources/list requests for openai-mcp client', () => {
			const result = (transport as any).shouldHandle({ method: 'resources/list' }, 'openai-mcp');
			expect(result).toBe(true);
		});

		it('should handle resources/read requests for non-openai-mcp clients', () => {
			const result = (transport as any).shouldHandle({ method: 'resources/read' });
			expect(result).toBe(true);
		});

		it('should handle resources/read requests for openai-mcp client', () => {
			const result = (transport as any).shouldHandle({ method: 'resources/read' }, 'openai-mcp');
			expect(result).toBe(true);
		});

		it('should handle resources/templates/list requests for non-openai-mcp clients', () => {
			const result = (transport as any).shouldHandle({ method: 'resources/templates/list' });
			expect(result).toBe(true);
		});

		it('should handle resources/templates/list requests for openai-mcp client', () => {
			const result = (transport as any).shouldHandle({ method: 'resources/templates/list' }, 'openai-mcp');
			expect(result).toBe(true);
		});

		it('should handle undefined method gracefully', () => {
			const result = (transport as any).shouldHandle({});
			expect(result).toBe(false);
		});

		it('should handle undefined body gracefully', () => {
			const result = (transport as any).shouldHandle(undefined);
			expect(result).toBe(false);
		});

		it('should handle null body gracefully', () => {
			const result = (transport as any).shouldHandle(null);
			expect(result).toBe(false);
		});
	});

	describe('skipGradioSetup', () => {
		it('should not skip setup for Gradio endpoint tool calls', () => {
			const result = (transport as any).skipGradioSetup({
				method: 'tools/call',
				params: { name: 'gr1_predict' },
			});

			expect(result).toBe(false);
		});

		it('should not skip setup for dynamic_space invoke calls', () => {
			const result = (transport as any).skipGradioSetup({
				method: 'tools/call',
				params: { name: 'dynamic_space', arguments: { operation: 'invoke' } },
			});

			expect(result).toBe(false);
		});

		it('should skip setup for normal local tool calls', () => {
			const result = (transport as any).skipGradioSetup({
				method: 'tools/call',
				params: { name: 'hub_repo_search' },
			});

			expect(result).toBe(true);
		});
	});

	describe('unsupported resource subscriptions', () => {
		it('includes resource URIs in tracked method names', () => {
			expect(
				(transport as any).extractMethodForTracking({
					method: 'resources/read',
					params: { uri: 'skill://example/SKILL.md' },
				})
			).toBe('resources/read:skill://example/SKILL.md');

			expect(
				(transport as any).extractMethodForTracking({
					method: 'resources/subscribe',
					params: { uri: 'skill://example/SKILL.md' },
				})
			).toBe('resources/subscribe:skill://example/SKILL.md');

			expect(
				(transport as any).extractMethodForTracking({
					method: 'resources/unsubscribe',
					params: { uri: 'skill://example/SKILL.md' },
				})
			).toBe('resources/unsubscribe:skill://example/SKILL.md');
		});

		it('attributes early resources/subscribe rejections to known analytics session client info', async () => {
			process.env.ANALYTICS_MODE = 'true';
			const mockServerFactory = vi.fn() as unknown as ServerFactory;
			transport = new StatelessHttpTransport(mockServerFactory, express());

			const sessionId = 'session-1';
			const clientInfo = { name: 'cursor-vscode', version: '1.2.3' };
			(transport as any).createAnalyticsSession(sessionId, false, '127.0.0.1');
			(transport as any).updateAnalyticsSessionClientInfo(sessionId, clientInfo);

			const req = {
				headers: { 'mcp-session-id': sessionId },
				query: {},
				body: {
					jsonrpc: '2.0',
					id: 1,
					method: 'resources/subscribe',
					params: { uri: 'skill://example/SKILL.md' },
				},
				ip: '127.0.0.1',
			};
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn().mockReturnThis(),
			};

			await (transport as any).handleJsonRpcRequest(req, res);

			const methodMetrics = transport.getMetrics().methods.get('resources/subscribe:skill://example/SKILL.md');
			expect(methodMetrics).toMatchObject({ count: 1, errors: 1 });
			expect(methodMetrics?.byClient.get(clientInfo.name)?.count).toBe(1);
			expect(mockServerFactory).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
		});
	});

	describe('production request path', () => {
		it('preserves bouquet and mix query parameters and exposes initialize dashboard metrics', async () => {
			process.env.ANALYTICS_MODE = 'true';
			const app = express();
			app.use(express.json());
			const serverFactory = vi.fn(async () => {
				const server = new McpServer({ name: 'stateless-test', version: '1.0.0' });
				server.registerTool(
					'progress_test',
					{
						description: 'Emits progress for transport testing.',
						inputSchema: {},
					},
					async (_params, extra) => {
						await createProgressRelay(extra)?.({ progress: 1, total: 2, message: 'Halfway' });
						return { content: [{ type: 'text', text: 'done' }] };
					}
				);
				return { server, enabledToolIds: [] };
			});
			transport = new StatelessHttpTransport(serverFactory, app);
			await transport.initialize();

			const httpServer = app.listen(0);

			try {
				await new Promise<void>((resolve, reject) => {
					httpServer.once('listening', resolve);
					httpServer.once('error', reject);
				});
				const address = httpServer.address();
				if (!address || typeof address === 'string') {
					throw new Error('Expected the test server to listen on a TCP port');
				}

				const response = await fetch(`http://127.0.0.1:${address.port}/mcp?bouquet=search&mix=sandbox`, {
					method: 'POST',
					headers: {
						accept: 'application/json, text/event-stream',
						'content-type': 'application/json',
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'initialize',
						params: {
							protocolVersion: '2025-03-26',
							capabilities: {},
							clientInfo: { name: 'contract-test', version: '1.0.0' },
						},
					}),
				});

				expect(response.status).toBe(200);
				const sessionId = response.headers.get('mcp-session-id');
				expect(sessionId).toBeTruthy();
				expect(serverFactory).toHaveBeenCalledTimes(1);
				expect(serverFactory.mock.calls[0]?.[0]).toMatchObject({
					'x-mcp-bouquet': 'search',
					'x-mcp-mix': 'sandbox',
				});

				const metrics = transport.getMetrics();
				expect(metrics.methods.get('initialize')).toMatchObject({ count: 1, errors: 0 });
				expect(metrics.sessions.created).toBe(1);
				expect(metrics.connections.active).toBe(1);
				expect(transport.getSessions()).toHaveLength(1);

				const dashboardMetrics = formatMetricsForAPI(metrics, 'streamableHttpJson', true, [
					{
						id: sessionId ?? '',
						connectedAt: transport.getSessions()[0]?.connectedAt.toISOString() ?? '',
						lastActivity: transport.getSessions()[0]?.lastActivity.toISOString() ?? '',
						requestCount: 1,
						clientInfo: { name: 'contract-test', version: '1.0.0' },
						isConnected: true,
						connectionStatus: 'Connected',
					},
				]);
				expect(dashboardMetrics.methods).toContainEqual(
					expect.objectContaining({ method: 'initialize', count: 1, errors: 0 })
				);
				expect(dashboardMetrics.sessions).toHaveLength(1);

				const progressResponse = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
					method: 'POST',
					headers: {
						accept: 'application/json, text/event-stream',
						'content-type': 'application/json',
						'mcp-session-id': sessionId ?? '',
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 2,
						method: 'tools/call',
						params: {
							name: 'progress_test',
							arguments: {},
							_meta: { progressToken: 'test-token' },
						},
					}),
				});
				expect(progressResponse.status).toBe(200);
				expect(progressResponse.headers.get('content-type')).toContain('text/event-stream');
				const progressBody = await progressResponse.text();
				expect(progressBody).toContain('"method":"notifications/progress"');
				expect(progressBody).toContain('"progressToken":"test-token"');
				expect(progressBody).toContain('"message":"Halfway"');
				expect(progressBody).toContain('"result":{"content":[{"type":"text","text":"done"}]}');

				const jsonToolResponse = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
					method: 'POST',
					headers: {
						accept: 'application/json, text/event-stream',
						'content-type': 'application/json',
						'mcp-session-id': sessionId ?? '',
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 3,
						method: 'tools/call',
						params: { name: 'progress_test', arguments: {} },
					}),
				});
				expect(jsonToolResponse.status).toBe(200);
				expect(jsonToolResponse.headers.get('content-type')).toContain('application/json');
				expect(await jsonToolResponse.json()).toMatchObject({
					result: { content: [{ type: 'text', text: 'done' }] },
				});
				expect(transport.getMetrics().methods.get('tools/call:progress_test')).toMatchObject({
					count: 2,
					errors: 0,
				});

				const unknownToolResponse = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
					method: 'POST',
					headers: {
						accept: 'application/json, text/event-stream',
						'content-type': 'application/json',
						'mcp-session-id': sessionId ?? '',
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 4,
						method: 'tools/call',
						params: { name: 'missing_tool', arguments: {} },
					}),
				});
				expect(unknownToolResponse.status).toBe(200);
				expect(await unknownToolResponse.json()).toMatchObject({
					result: { isError: true, content: expect.any(Array) },
				});
				expect(transport.getMetrics().methods.get('tools/call:missing_tool')).toMatchObject({
					count: 1,
					errors: 1,
				});

				const deleteResponse = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
					method: 'DELETE',
					headers: { 'mcp-session-id': sessionId ?? '' },
				});
				expect(deleteResponse.status).toBe(200);
				expect(transport.getMetrics().sessions.deleted).toBe(1);
				expect(transport.getMetrics().connections.active).toBe(0);
				expect(transport.getSessions()).toHaveLength(0);
				expect(Array.from(transport.getMetrics().clients.values())[0]).toMatchObject({
					isConnected: false,
					activeConnections: 0,
				});
			} finally {
				await new Promise<void>((resolve, reject) => {
					httpServer.close((error) => (error ? reject(error) : resolve()));
				});
			}
		});
	});

	describe('unsupported prompts', () => {
		it('logs prompts/get attempts without building a prompt-capable server', async () => {
			const mockServerFactory = vi.fn() as unknown as ServerFactory;
			transport = new StatelessHttpTransport(mockServerFactory, express());
			const req = {
				headers: {},
				query: {},
				body: {
					jsonrpc: '2.0',
					id: 1,
					method: 'prompts/get',
					params: { name: 'Retired Prompt' },
				},
				ip: '127.0.0.1',
			};
			const res = {
				set: vi.fn().mockReturnThis(),
				status: vi.fn().mockReturnThis(),
				json: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
			};

			await (transport as any).handleJsonRpcRequest(req, res);

			expect(transport.getMetrics().methods.get('prompts/get:Retired Prompt')).toMatchObject({
				count: 1,
				errors: 1,
			});
			expect(mockServerFactory).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({ message: 'prompts/get is not supported' }),
				})
			);
		});
	});

	describe('disabled tools', () => {
		it('rejects disabled calls before dispatch and records a dashboard error', async () => {
			process.env.DISABLE_TOOLS = 'hub_repo_search';
			const mockServerFactory = vi.fn() as unknown as ServerFactory;
			transport = new StatelessHttpTransport(mockServerFactory, express());

			const req = {
				headers: {},
				query: {},
				body: {
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'hub_repo_search', arguments: { query: 'bert' } },
				},
				ip: '127.0.0.1',
			};
			const res = {
				set: vi.fn().mockReturnThis(),
				status: vi.fn().mockReturnThis(),
				json: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
			};

			await (transport as any).handleJsonRpcRequest(req, res);

			const methodMetrics = transport.getMetrics().methods.get('tools/call:hub_repo_search');
			expect(methodMetrics).toMatchObject({ count: 1, errors: 1 });
			expect(mockServerFactory).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({
						message: 'Invalid params: Tool hub_repo_search is disabled by server configuration',
					}),
				})
			);
		});
	});
});
