import { z } from 'zod';

// Project-specific SSE envelope used by metadata streaming and other server-initiated notifications.
export const SseEventEnvelopeSchema = z.object({
  event: z.enum(['progress', 'partial', 'result', 'error', 'done', 'cancel_ack']),
  requestId: z.union([z.string(), z.number()]),
  payload: z.record(z.string(), z.any()).nullable().optional() // Zod v4: record(key, value)
}).strict();

export type SseEventEnvelope = z.infer<typeof SseEventEnvelopeSchema>;
