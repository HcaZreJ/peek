import { describe, it, expect } from 'vitest';
import { sendJson } from '../../src/server/http/respond';

function makeRes() {
  const calls: { status: number | undefined; headers: Record<string, string> | undefined; body: string | undefined; endCallCount: number } = {
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

describe('sendJson (visible samples)', () => {
  it('sendJson_happy_path_200_object_body', () => {
    /**
     * A plain 200 response with an object body should write status 200,
     * a Content-Type of 'application/json; charset=utf-8',
     * and end with the JSON-serialised body.
     */
    const res = makeRes();
    const body = { message: 'ok', count: 42 };
    sendJson(res, 200, body);

    expect(res._calls.status).toBe(200);
    expect(res._calls.headers).toEqual({ 'Content-Type': 'application/json; charset=utf-8' });
    expect(JSON.parse(res._calls.body)).toEqual(body);
  });

  it('sendJson_happy_path_404_null_body', () => {
    /**
     * A 404 response with a null body should write status 404 and serialise null.
     */
    const res = makeRes();
    sendJson(res, 404, null);

    expect(res._calls.status).toBe(404);
    expect(res._calls.headers).toEqual({ 'Content-Type': 'application/json; charset=utf-8' });
    expect(JSON.parse(res._calls.body)).toBeNull();
  });

  it('sendJson_circular_reference_falls_back_to_500', () => {
    /**
     * When the body cannot be serialised (circular reference),
     * the function must fall back to status 500 and send a body
     * that parses to an object containing an 'error' string field.
     */
    const res = makeRes();
    const circular: any = {};
    circular.self = circular;
    sendJson(res, 200, circular);

    expect(res._calls.status).toBe(500);
    expect(res._calls.headers).toEqual({ 'Content-Type': 'application/json; charset=utf-8' });
    const parsed = JSON.parse(res._calls.body);
    expect(typeof parsed.error).toBe('string');
  });
});
