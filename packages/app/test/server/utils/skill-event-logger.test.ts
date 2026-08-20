import { describe, expect, it } from 'vitest';
import { buildSkillLogEntry, type SkillEventLoggerOptions } from '../../../src/server/utils/skill-event-logger.js';

describe('buildSkillLogEntry', () => {
	it('emits only allowlisted, privacy-preserving Skills telemetry', () => {
		const privateValues = {
			uri: 'skill://private-org/private-skill/SKILL.md',
			cursor: 'private-cursor',
			content: 'PRIVATE_SKILL_CONTENT',
			errorMessage: 'Unknown skill URI: skill://private-org/private-skill/SKILL.md',
		};
		const options = {
			clientSessionId: 'session-1',
			requestId: 'request-1',
			protocolEra: 'modern',
			protocolVersion: '2026-07-28',
			userHash: 'user-hash',
			isAuthenticated: true,
			clientName: 'test-client',
			clientVersion: '1.2.3',
			durationMs: 12.6,
			success: true,
			cursorSupplied: true,
			responseItemCount: 2,
			...privateValues,
		} satisfies SkillEventLoggerOptions & typeof privateValues;

		const entry = buildSkillLogEntry('skills/list', options);

		expect(entry).toMatchObject({
			clientSessionId: 'session-1',
			requestId: 'request-1',
			protocolEra: 'modern',
			protocolVersion: '2026-07-28',
			userHash: 'user-hash',
			name: 'test-client',
			version: '1.2.3',
			methodName: 'skills/list',
			authorized: true,
			durationMs: 13,
			success: true,
			cursorSupplied: true,
			responseItemCount: 2,
		});
		expect(Object.keys(entry).sort()).toEqual(
			[
				'authorized',
				'clientSessionId',
				'cursorSupplied',
				'durationMs',
				'mcpServerSessionId',
				'methodName',
				'name',
				'protocolEra',
				'protocolVersion',
				'requestId',
				'responseItemCount',
				'serverBuildSha',
				'serverVersion',
				'success',
				'userHash',
				'version',
			].sort()
		);

		const serialized = JSON.stringify(entry);
		for (const privateValue of Object.values(privateValues)) {
			expect(serialized).not.toContain(privateValue);
		}
	});

	it('normalizes duration and rejects invalid response counts', () => {
		const entry = buildSkillLogEntry('skills/resource-read', {
			protocolEra: 'legacy',
			isAuthenticated: false,
			durationMs: -1.6,
			success: false,
			cursorSupplied: false,
			responseItemCount: Number.NaN,
		});

		expect(entry.durationMs).toBe(0);
		expect(entry.responseItemCount).toBeNull();
	});
});
