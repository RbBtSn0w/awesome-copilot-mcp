export interface SseEvent<T = any> {
  event?: string;
  data?: T;
  raw: string;
}

// Parse an SSE response body into structured events.
// This is tolerant: it joins multi-line data blocks and falls back to raw strings if JSON.parse fails.
export function parseSse(text: string | undefined | null): SseEvent[] {
  const safe = text ?? '';
  return safe
    .split(/\r?\n\r?\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split(/\r?\n/);
      const eventLine = lines.find((l) => l.startsWith('event:'));
      const event = eventLine ? eventLine.replace(/^event:\s*/, '') : undefined;
      const dataLines = lines
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.replace(/^data:\s*/, ''));
      const dataText = dataLines.join('\n');
      let data: any = dataText;
      try {
        if (dataText) data = JSON.parse(dataText);
      } catch {
        // leave as raw string
      }
      return { event, data, raw: chunk } satisfies SseEvent;
    });
}

// Convenience to pull out just the parsed data payloads (dropping undefined/null)
export function collectSseData<T = any>(text: string | undefined | null): T[] {
  return parseSse(text)
    .map((e) => e.data as T)
    .filter((d) => d !== undefined && d !== null);
}
