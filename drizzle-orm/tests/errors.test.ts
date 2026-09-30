import { describe, test } from 'vitest';
import { DrizzleQueryError, formatQueryParams } from '~/errors.ts';

describe.concurrent('formatQueryParams', () => {
	test('renders Uint8Array as 0x-prefixed hex', ({ expect }) => {
		expect(formatQueryParams([new Uint8Array([0xde, 0xad, 0xbe, 0xef])])).toBe('0xdeadbeef');
	});

	test('renders Node Buffer as 0x-prefixed hex', ({ expect }) => {
		expect(formatQueryParams([Buffer.from([0x00, 0x0f, 0xff])])).toBe('0x000fff');
	});

	test('renders ArrayBuffer as 0x-prefixed hex', ({ expect }) => {
		expect(formatQueryParams([new Uint8Array([0x01, 0x02]).buffer])).toBe('0x0102');
	});

	test('truncates binary params longer than 32 bytes', ({ expect }) => {
		const bytes = new Uint8Array(40).fill(0xab);

		expect(formatQueryParams([bytes])).toBe(`0x${'ab'.repeat(32)}...(40 bytes)`);
	});

	test('does not truncate binary params of exactly 32 bytes', ({ expect }) => {
		const bytes = new Uint8Array(32).fill(0xab);

		expect(formatQueryParams([bytes])).toBe(`0x${'ab'.repeat(32)}`);
	});

	test('respects byteOffset of typed array views', ({ expect }) => {
		const view = new Uint8Array([0x00, 0x11, 0x22, 0x33]).subarray(1, 3);

		expect(formatQueryParams([view])).toBe('0x1122');
	});

	test('leaves non-binary params untouched', ({ expect }) => {
		expect(formatQueryParams(['John', 30, false, null])).toBe('John,30,false,');
	});
});

describe.concurrent('DrizzleQueryError', () => {
	test('hex-encodes binary params in the message', ({ expect }) => {
		const error = new DrizzleQueryError('select * from users where id = ?', [new Uint8Array([0x69, 0x47])]);

		expect(error.message).toBe('Failed query: select * from users where id = ?\nparams: 0x6947');
	});
});
