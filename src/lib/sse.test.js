import { describe, it, expect } from 'vitest';
import { parseSSE } from './sse.js';

describe('parseSSE', () => {
  it('parses a single complete frame', () => {
    const { events, rest } = parseSSE('event: chunk\ndata: {"text":"hi"}\n\n');
    expect(events).toEqual([{ event: 'chunk', data: '{"text":"hi"}' }]);
    expect(rest).toBe('');
  });

  it('holds back a frame split mid-line across chunks', () => {
    // First chunk ends mid-frame — nothing should be emitted yet.
    const first = parseSSE('event: chunk\ndata: {"te');
    expect(first.events).toEqual([]);
    expect(first.rest).toBe('event: chunk\ndata: {"te');

    // Second chunk completes the frame.
    const second = parseSSE(first.rest + 'xt":"hello"}\n\nevent: done\nda');
    expect(second.events).toEqual([
      { event: 'chunk', data: '{"text":"hello"}' },
    ]);
    expect(second.rest).toBe('event: done\nda');
  });

  it('parses multiple frames in one chunk', () => {
    const { events, rest } = parseSSE(
      'event: chunk\ndata: {"text":"a"}\n\n' +
        'event: chunk\ndata: {"text":"b"}\n\n' +
        'event: done\ndata: {"ok":true}\n\n'
    );
    expect(events).toEqual([
      { event: 'chunk', data: '{"text":"a"}' },
      { event: 'chunk', data: '{"text":"b"}' },
      { event: 'done', data: '{"ok":true}' },
    ]);
    expect(rest).toBe('');
  });

  it('parses event: error frames', () => {
    const { events } = parseSSE('event: error\ndata: {"error":"boom"}\n\n');
    expect(events).toEqual([{ event: 'error', data: '{"error":"boom"}' }]);
  });

  it('defaults to event "message" when no event line is present', () => {
    const { events } = parseSSE('data: {"text":"x"}\n\n');
    expect(events).toEqual([{ event: 'message', data: '{"text":"x"}' }]);
  });

  it('skips frames with no data', () => {
    const { events } = parseSSE('event: ping\n\n');
    expect(events).toEqual([]);
  });
});
