import * as core from '@actions/core'

import { Resource } from '@opentelemetry/resources'
import { MeterProvider, PeriodicExportingMetricReader, PushMetricExporter } from '@opentelemetry/sdk-metrics'
import { ActionInputs } from '../types'
import { ActionsConsoleMetricExporter } from './actionsExporter'
import { createGcpExporter } from './gcpExporter'

// only support GCP and ActionsConsole exporter for now
export const createExporter = (inputs: ActionInputs): PushMetricExporter => {
  switch (inputs.exporter) {
    case 'gcp':
      return createGcpExporter(inputs)
    case 'console':
      return new ActionsConsoleMetricExporter()
    default: {
      core.warning(`Unknown exporter ${inputs.exporter}. Falling back to ActionsConsole exporter`)
      return new ActionsConsoleMetricExporter()
    }
  }
}

export const setupOtel = (inputs: ActionInputs) => {
  core.info('Setting up telemetry...')

  const resource = new Resource({
    'service.namespace': 'github-actions',
    'service.name': 'actions-metrics-otlp',
  })
  const meterProvider = new MeterProvider({
    resource,
  })

  const exporter = createExporter(inputs)

  const reader = new PeriodicExportingMetricReader({
    exporter,
    // Export metrics every 10 seconds. 5 seconds is the smallest sample period allowed by
    // Cloud Monitoring.
    exportIntervalMillis: 10_000,
  })

  meterProvider.addMetricReader(reader)
  return meterProvider
}
