import { EventStoreDBInstrumentation } from '@eventstore/opentelemetry';
import * as LogsAPI from '@opentelemetry/api-logs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { ConsoleLogRecordExporter, LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import configuration from '../../configuration';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';

export function otelStart(serviceName: string, serviceVersion: string): void {
  const exporter = new OTLPTraceExporter({
    url: configuration.otel.endpoint,
  });

  const loggerProvider = new LoggerProvider();
  loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()));
  LogsAPI.logs.setGlobalLoggerProvider(loggerProvider);

  const metricExporter: OTLPMetricExporter = new OTLPMetricExporter();

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
    metricReader: new PeriodicExportingMetricReader({
      // exporter: new ConsoleMetricExporter(),
      exporter: metricExporter,
      exportIntervalMillis: 10000,
    }),
    instrumentations: [getNodeAutoInstrumentations(), new EventStoreDBInstrumentation()],
  });

  sdk.start();
}
