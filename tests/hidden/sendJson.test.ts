import { describe, it, expect } from 'vitest';
import { sendJson } from '../../src/server/http/respond';

function makeRes() {
  const calls: {
    status: number | undefined;
    headers: Record<string, string> | undefined;
    body: string | undefined;
    endCallCount: number;
  } = {
    status: undefined,
    headers: undefined,
    body: undefined,
    endCallCount: 0,
  };
  return {
    writeHead(s: number, h: any) { calls.status = s; calls.headers = h; },
    end(p?: any) { calls.body = p; calls.endCallCount += 1; },
    _calls: calls,
  } as any;
}

describe('sendJson (hidden comprehensive)', () => {
  // ── Status pass-through ──────────────────────────────────────────────────

  it('sendJson_status_200_passed_through', () => {
    /** Status 200 must be forwarded verbatim to writeHead. */
    const res = makeRes();
    sendJson(res, 200, {});
    expect(res._calls.status).toBe(200);
  });

  it('sendJson_status_404_passed_through', () => {
    /** Status 404 must be forwarded verbatim to writeHead. */
    const res = makeRes();
    sendJson(res, 404, { error: 'not found' });
    expect(res._calls.status).toBe(404);
  });

  it('sendJson_status_500_passed_through_for_valid_body', () => {
    /** Status 500 with a valid body must forward 500 (not override). */
    const res = makeRes();
    sendJson(res, 500, { error: 'internal' });
    expect(res._calls.status).toBe(500);
  });

  // ── Content-Type header ──────────────────────────────────────────────────

  it('sendJson_content_type_header_exact_value', () => {
    /** Content-Type must be exactly 'application/json; charset=utf-8'. */
    const res = makeRes();
    sendJson(res, 200, { a: 1 });
    expect(res._calls.headers).toEqual({ 'Content-Type': 'application/json; charset=utf-8' });
  });

  it('sendJson_content_type_header_set_on_error_fallback', () => {
    /** Content-Type must also be 'application/json; charset=utf-8' on the 500 fallback. */
    const res = makeRes();
    const circular: any = {};
    circular.self = circular;
    sendJson(res, 200, circular);
    expect(res._calls.headers).toEqual({ 'Content-Type': 'application/json; charset=utf-8' });
  });

  // ── Body serialisation – various types ──────────────────────────────────

  it('sendJson_body_object_round_trips_correctly', () => {
    /** Object body: JSON.parse of end() argument must deep-equal the original. */
    const res = makeRes();
    const body = { id: 1, name: 'Alice', active: true };
    sendJson(res, 200, body);
    expect(JSON.parse(res._calls.body)).toEqual(body);
  });

  it('sendJson_body_array_round_trips_correctly', () => {
    /** Array body must be serialised and parse back to the same array. */
    const res = makeRes();
    const body = [1, 'two', null, { three: 3 }];
    sendJson(res, 200, body);
    expect(JSON.parse(res._calls.body)).toEqual(body);
  });

  it('sendJson_body_null_serialised_correctly', () => {
    /** null body must produce the string "null". */
    const res = makeRes();
    sendJson(res, 200, null);
    expect(JSON.parse(res._calls.body)).toBeNull();
  });

  it('sendJson_body_string_serialised_correctly', () => {
    /** A string body must be JSON-serialised (with surrounding quotes). */
    const res = makeRes();
    sendJson(res, 200, 'hello world');
    expect(JSON.parse(res._calls.body)).toBe('hello world');
  });

  it('sendJson_body_number_serialised_correctly', () => {
    /** A numeric body must be serialised as a plain JSON number. */
    const res = makeRes();
    sendJson(res, 200, 42);
    expect(JSON.parse(res._calls.body)).toBe(42);
  });

  // ── Chinese / multi-byte characters ──────────────────────────────────────

  it('sendJson_chinese_body_round_trips_without_corruption', () => {
    /**
     * Multi-byte (Chinese) strings must survive JSON serialisation unchanged.
     * JSON.parse of the transmitted body must equal the original object.
     */
    const res = makeRes();
    const body = { msg: '你好，世界', code: 200 };
    sendJson(res, 200, body);
    expect(JSON.parse(res._calls.body)).toEqual(body);
  });

  // ── end() call count ─────────────────────────────────────────────────────

  it('sendJson_end_called_exactly_once_on_success', () => {
    /** end() must be invoked exactly once for a valid body. */
    const res = makeRes();
    sendJson(res, 200, { x: 1 });
    expect(res._calls.endCallCount).toBe(1);
  });

  it('sendJson_end_called_exactly_once_on_circular_error', () => {
    /** end() must be invoked exactly once even when the body is unserializable. */
    const res = makeRes();
    const circular: any = {};
    circular.ref = circular;
    sendJson(res, 200, circular);
    expect(res._calls.endCallCount).toBe(1);
  });

  // ── Circular reference fallback details ──────────────────────────────────

  it('sendJson_circular_reference_status_overridden_to_500', () => {
    /** Any non-500 original status must be overridden to 500 on serialisation failure. */
    const res = makeRes();
    const circular: any = {};
    circular.loop = circular;
    sendJson(res, 201, circular);
    expect(res._calls.status).toBe(500);
  });

  it('sendJson_circular_reference_body_contains_error_string_field', () => {
    /** The fallback error body must parse to an object with a string 'error' field. */
    const res = makeRes();
    const circular: any = {};
    circular.a = circular;
    sendJson(res, 200, circular);
    const parsed = JSON.parse(res._calls.body);
    expect(typeof parsed).toBe('object');
    expect(parsed).not.toBeNull();
    expect(typeof parsed.error).toBe('string');
  });

  it('sendJson_circular_reference_original_data_not_leaked', () => {
    /**
     * The fallback body must not contain raw non-serialisable data;
     * it must be a valid JSON string that can be parsed without throwing.
     */
    const res = makeRes();
    const circular: any = {};
    circular.self = circular;
    sendJson(res, 200, circular);
    // Must not throw:
    expect(() => JSON.parse(res._calls.body)).not.toThrow();
  });
});
