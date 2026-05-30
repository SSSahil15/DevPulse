/**
 * instrumentation.js — OpenTelemetry SDK Initialization
 *
 * MUST be required FIRST before any other module via:
 *   node --require ./src/instrumentation.js src/server.js
 *   (or set in Dockerfile CMD)
 *
 * Auto-instruments:
 *  - Express (HTTP routes → spans)
 *  - http/https (outbound calls to GitHub API, AI service)
 *  - pg (PostgreSQL queries)
 *  - ioredis (Redis commands)
 */

'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const OTEL_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://devpulse_otel_collector:4318';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'devpulse-backend';

const sdk = new NodeSDK({
  serviceName: SERVICE_NAME,

  traceExporter: new OTLPTraceExporter({
    url: `${OTEL_ENDPOINT}/v1/traces`,
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      // Exclude noisy health-check spans to reduce trace volume
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => req.url?.includes('/health'),
        ignoreOutgoingRequestHook: (req) => req.hostname?.includes('health'),
      },
      // Instrument pg for DB query spans
      '@opentelemetry/instrumentation-pg': { enhancedDatabaseReporting: true },
      // Instrument ioredis for Redis command spans
      '@opentelemetry/instrumentation-ioredis': {},
      // Instrument express for route-level spans
      '@opentelemetry/instrumentation-express': {},
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(console.error);
});

module.exports = sdk;
