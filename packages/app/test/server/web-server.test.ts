import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { WebServer } from '../../src/server/web-server.js';

function listen(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.listen(0, (error?: Error) => {
			if (error) reject(error);
			else resolve();
		});
	});
}

function close(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) reject(error);
			else resolve();
		});
	});
}

describe('WebServer', () => {
	const servers: Server[] = [];
	const webServers: WebServer[] = [];

	afterEach(async () => {
		await Promise.allSettled(webServers.map((server) => server.stop()));
		await Promise.allSettled(servers.map((server) => close(server)));
		webServers.length = 0;
		servers.length = 0;
	});

	it('rejects startup when Express cannot bind the requested port', async () => {
		const blocker = createServer();
		servers.push(blocker);
		await listen(blocker);

		const address = blocker.address();
		if (!address || typeof address === 'string') {
			throw new Error('Expected the blocker to listen on a TCP port');
		}

		const webServer = new WebServer();
		webServers.push(webServer);

		await expect(webServer.start(address.port)).rejects.toMatchObject({ code: 'EADDRINUSE' });
		await expect(webServer.start(0)).resolves.toBeUndefined();
	});
});
