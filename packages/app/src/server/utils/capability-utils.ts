import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import type { McpApiClient } from './mcp-api-client.js';

interface RegisterCapabilitiesOptions {
	/**
	 * Whether resources have been registered on the server
	 * If true, the resources capability will be included
	 */
	hasResources?: boolean;
	/**
	 * Whether the experimental Skills extension (SEP-2640) is active.
	 * When true, the `resources` capability is forced on and the
	 * `extensions["io.modelcontextprotocol/skills"]` flag is advertised.
	 */
	hasSkills?: boolean;
}

/**
 * Registers MCP capabilities on a server instance
 *
 * This utility function handles:
 * - Configuring tools and resources capabilities
 * - Determining listChanged flags based on transport mode
 *
 * @param server - The McpServer instance to register capabilities on
 * @param sharedApiClient - The shared API client for transport info
 * @param options - Configuration options for capabilities
 */
export function registerCapabilities(
	server: McpServer,
	sharedApiClient: McpApiClient,
	options: RegisterCapabilitiesOptions = {}
): void {
	const transportInfo = sharedApiClient.getTransportInfo();
	const { hasResources = false, hasSkills = false } = options;
	const advertiseResources = hasResources || hasSkills;

	const capabilities: ServerCapabilities = {
		tools: {
			listChanged: !transportInfo?.jsonResponseEnabled,
		},
		...(advertiseResources
			? {
					resources: {
						// We do not support resource subscriptions (skills are static —
						// nothing to notify `resources/updated` about). Advertise explicitly
						// rather than relying on omission.
						subscribe: false,
						listChanged: false,
					},
				}
			: {}),
		...(hasSkills
			? {
					extensions: {
						// SEP-2640 capability declaration. We implement the optional
						// `resources/directory/read` method, so advertise `directoryRead: true`.
						// The non-empty object also sidesteps the empty-object → `[]` JSON
						// serialization gotcha reported in experimental-ext-skills PR #95.
						'io.modelcontextprotocol/skills': {
							directoryRead: true,
						},
					},
				}
			: {}),
	};

	server.server.registerCapabilities(capabilities);
}
