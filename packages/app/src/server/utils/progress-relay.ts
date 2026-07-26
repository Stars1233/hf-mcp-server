import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

interface ProgressUpdate {
	progress?: number;
	total?: number;
	message?: string;
}

export type ProgressRelay = (progress: ProgressUpdate) => Promise<void>;

export function createProgressRelay(
	extra: RequestHandlerExtra<ServerRequest, ServerNotification> | undefined
): ProgressRelay | undefined {
	if (!extra) {
		return undefined;
	}

	const progressToken = extra._meta?.progressToken;
	if (progressToken === undefined || (typeof progressToken !== 'number' && typeof progressToken !== 'string')) {
		return undefined;
	}

	let disabled = false;
	let fallbackProgress = 0;

	return async (progress): Promise<void> => {
		if (disabled || extra.signal.aborted) {
			disabled = true;
			return;
		}

		let progressValue = progress.progress;
		if (progressValue === undefined) {
			fallbackProgress += 1;
			progressValue = fallbackProgress;
		} else {
			fallbackProgress = Math.max(fallbackProgress, progressValue);
		}
		try {
			await extra.sendNotification({
				method: 'notifications/progress',
				params: {
					progressToken,
					progress: progressValue,
					...(progress.total !== undefined ? { total: progress.total } : {}),
					...(progress.message !== undefined ? { message: progress.message } : {}),
				},
			});
		} catch (error) {
			disabled = true;
			logger.trace({ error, progressToken }, 'Progress relay disabled after notification failure');
		}
	};
}
