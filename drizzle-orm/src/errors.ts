import { entityKind } from '~/entity.ts';

const hexDigits = '0123456789abcdef';
const maxHexBytes = 32;

function toHex(bytes: Uint8Array): string {
	const length = Math.min(bytes.length, maxHexBytes);
	let hex = '0x';
	for (let i = 0; i < length; i++) {
		const byte = bytes[i]!;
		hex += hexDigits[byte >> 4]! + hexDigits[byte & 0x0f]!;
	}
	if (bytes.length > maxHexBytes) {
		hex += `...(${bytes.length} bytes)`;
	}
	return hex;
}

/**
 * Formats query parameters for error messages. Binary values (`ArrayBuffer`,
 * `Uint8Array`, Node `Buffer`, any typed array / `DataView`) are rendered as a
 * `0x`-prefixed hex string instead of their default `toString()`, which would
 * otherwise produce unreadable replacement characters. Values longer than
 * 32 bytes are truncated and suffixed with their total length.
 */
export function formatQueryParams(params: readonly unknown[]): string {
	return params.map((param) => {
		if (param instanceof ArrayBuffer) { // oxlint-disable-line drizzle-internal/no-instanceof
			return toHex(new Uint8Array(param));
		}
		if (ArrayBuffer.isView(param)) {
			return toHex(new Uint8Array(param.buffer, param.byteOffset, param.byteLength));
		}
		return param;
	}).toString();
}

export class DrizzleError extends Error {
	static readonly [entityKind]: string = 'DrizzleError';

	constructor({ message, cause }: { message?: string; cause?: unknown }) {
		super(message);
		this.name = 'DrizzleError';
		this.cause = cause;
	}
}

export class DrizzleQueryError extends Error {
	static readonly [entityKind]: string = 'DrizzleQueryError';

	constructor(
		public query: string,
		public params: any[],
		public override cause?: Error,
	) {
		super(`Failed query: ${query}\nparams: ${formatQueryParams(params)}`);
		this.name = 'DrizzleQueryError';
		Error.captureStackTrace(this, DrizzleQueryError);

		// ES2022+: preserves original error on `.cause`
		if (cause) (this as any).cause = cause;
	}
}

export class TransactionRollbackError extends DrizzleError {
	static override readonly [entityKind]: string = 'TransactionRollbackError';

	constructor() {
		super({ message: 'Rollback' });
		this.name = 'TransactionRollbackError';
	}
}
