import { trace } from '@opentelemetry/api';

export const tracer = trace.getTracer('esdb-service');
