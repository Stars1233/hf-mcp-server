export const HF_FS_ERROR_CODES = [
	'HF_FS_INVALID_ARGUMENT',
	'HF_FS_NOT_FOUND',
	'HF_FS_NOT_A_DIRECTORY',
	'HF_FS_NOT_A_FILE',
	'HF_FS_UNSUPPORTED_OPERATION',
	'HF_FS_TEXT_ONLY',
	'HF_FS_IMAGE_ONLY',
	'HF_FS_UNSUPPORTED_MEDIA',
	'HF_FS_IMAGE_TOO_LARGE',
	'HF_FS_IMAGE_CONTENT_DISABLED',
	'HF_FS_ATTACHMENT_INTEGRITY',
] as const;

export type HfFsErrorCode = (typeof HF_FS_ERROR_CODES)[number];

export interface HfFsRecoveryError {
	code: HfFsErrorCode;
	message: string;
	recovery: string;
	retryable: false;
	suggestedOperation?: 'ls' | 'cat' | 'attach' | 'stat' | 'search';
}

export class HfFsTextOnlyError extends Error {
	readonly code = 'HF_FS_TEXT_ONLY';
	readonly suggestedOperation: 'attach' | 'stat';

	constructor(message: string, suggestedOperation: 'attach' | 'stat' = 'stat') {
		super(message);
		this.name = 'HfFsTextOnlyError';
		this.suggestedOperation = suggestedOperation;
	}
}

export class HfFsImageOnlyError extends Error {
	readonly code = 'HF_FS_IMAGE_ONLY';

	constructor(message: string) {
		super(message);
		this.name = 'HfFsImageOnlyError';
	}
}

export class HfFsUnsupportedMediaError extends Error {
	readonly code = 'HF_FS_UNSUPPORTED_MEDIA';

	constructor(message: string) {
		super(message);
		this.name = 'HfFsUnsupportedMediaError';
	}
}

export class HfFsImageTooLargeError extends Error {
	readonly code = 'HF_FS_IMAGE_TOO_LARGE';

	constructor(message: string) {
		super(message);
		this.name = 'HfFsImageTooLargeError';
	}
}

export class HfFsImageContentDisabledError extends Error {
	readonly code = 'HF_FS_IMAGE_CONTENT_DISABLED';

	constructor(message = 'Image content is disabled for this MCP request by x-mcp-no-image-content.') {
		super(message);
		this.name = 'HfFsImageContentDisabledError';
	}
}

export class HfFsAttachmentIntegrityError extends Error {
	readonly code = 'HF_FS_ATTACHMENT_INTEGRITY';

	constructor(message: string) {
		super(message);
		this.name = 'HfFsAttachmentIntegrityError';
	}
}

export function classifyHfFsError(error: unknown): HfFsRecoveryError | undefined {
	if (!(error instanceof Error)) {
		return undefined;
	}

	if (error instanceof HfFsTextOnlyError || errorCode(error) === 'HF_FS_TEXT_ONLY') {
		const suggestedOperation =
			'suggestedOperation' in error && error.suggestedOperation === 'attach' ? 'attach' : 'stat';
		return recoveryError(
			'HF_FS_TEXT_ONLY',
			error.message,
			suggestedOperation === 'attach'
				? 'Use attach to return this image to the model, or stat for metadata.'
				: 'Use stat for metadata or ls on the parent directory. Do not use cat for binary or non-UTF-8 content.',
			suggestedOperation
		);
	}
	if (error instanceof HfFsImageOnlyError || errorCode(error) === 'HF_FS_IMAGE_ONLY') {
		return recoveryError(
			'HF_FS_IMAGE_ONLY',
			error.message,
			'Use cat to read this text file, or stat for metadata.',
			'cat'
		);
	}
	if (error instanceof HfFsUnsupportedMediaError || errorCode(error) === 'HF_FS_UNSUPPORTED_MEDIA') {
		return recoveryError(
			'HF_FS_UNSUPPORTED_MEDIA',
			error.message,
			'Attach supports only files ending in .jpg, .jpeg, .png, or .webp. Use stat for metadata.',
			'stat'
		);
	}
	if (error instanceof HfFsImageTooLargeError || errorCode(error) === 'HF_FS_IMAGE_TOO_LARGE') {
		return recoveryError(
			'HF_FS_IMAGE_TOO_LARGE',
			error.message,
			'Use stat for metadata. Attach cannot truncate images or exceed its configured complete-file limit.',
			'stat'
		);
	}
	if (error instanceof HfFsImageContentDisabledError || errorCode(error) === 'HF_FS_IMAGE_CONTENT_DISABLED') {
		return recoveryError(
			'HF_FS_IMAGE_CONTENT_DISABLED',
			error.message,
			'Remove x-mcp-no-image-content: true to allow image content, or use stat for metadata.',
			'stat'
		);
	}
	if (error instanceof HfFsAttachmentIntegrityError || errorCode(error) === 'HF_FS_ATTACHMENT_INTEGRITY') {
		return recoveryError(
			'HF_FS_ATTACHMENT_INTEGRITY',
			error.message,
			'Retry attach. If the integrity error persists, use stat for metadata and report the inconsistent Hub response.',
			'stat'
		);
	}
	if (error.message.startsWith('EINVAL:')) {
		return recoveryError(
			'HF_FS_INVALID_ARGUMENT',
			error.message,
			'Correct the URI or flags using the operation grammar and route-specific option guidance.'
		);
	}
	if (error.message.startsWith('ENOENT:') || error.message.startsWith('File does not exist:')) {
		return recoveryError(
			'HF_FS_NOT_FOUND',
			error.message,
			'Use stat to verify the target or ls/find to discover a returned URI before retrying.',
			'stat'
		);
	}
	if (error.message.startsWith('ENOTDIR:')) {
		return recoveryError(
			'HF_FS_NOT_A_DIRECTORY',
			error.message,
			'Use stat to inspect the target, then run ls or find only on a directory-like scope.',
			'stat'
		);
	}
	if (
		error.message.startsWith('EISDIR:') ||
		error.message.startsWith('cat requires a URI that points to a file path') ||
		error.message.startsWith('cat requires a file path') ||
		error.message.startsWith('attach requires a direct repository or bucket file URI') ||
		error.message.startsWith('attach requires a file path')
	) {
		return recoveryError(
			'HF_FS_NOT_A_FILE',
			error.message,
			'Use stat to confirm the target is a file, or ls/find to discover a returned file URI.',
			'stat'
		);
	}
	if (error.message.startsWith('ENOTSUP:')) {
		const suggestsSearch =
			error.message.includes('global hf:// root') ||
			error.message.includes('use search ') ||
			error.message.includes('search its resource root');
		return recoveryError(
			'HF_FS_UNSUPPORTED_OPERATION',
			error.message,
			'Follow the supported operation named in the error. Otherwise narrow the URI scope or remove the unsupported option.',
			suggestsSearch ? 'search' : undefined
		);
	}
	return undefined;
}

export function formatHfFsRecoveryError(error: HfFsRecoveryError): string {
	return `[${error.code}] ${error.message}\nRecovery: ${error.recovery}`;
}

function recoveryError(
	code: HfFsErrorCode,
	message: string,
	recovery: string,
	suggestedOperation?: HfFsRecoveryError['suggestedOperation']
): HfFsRecoveryError {
	return {
		code,
		message,
		recovery,
		retryable: false,
		...(suggestedOperation ? { suggestedOperation } : {}),
	};
}

function errorCode(error: Error): unknown {
	return 'code' in error ? error.code : undefined;
}
