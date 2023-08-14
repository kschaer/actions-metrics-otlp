import * as core from '@actions/core'

import { MetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { Resource } from '@opentelemetry/resources'
import { MeterProvider, PeriodicExportingMetricReader, PushMetricExporter } from '@opentelemetry/sdk-metrics'
import { ActionInputs } from '../types'
import { ActionsConsoleMetricExporter } from './actionsExporter'

const createGcpExporter = (inputs: ActionInputs): PushMetricExporter => {
  // Authenticate - this comes from google-github-actions/auth
  const keyFile = process.env.GOOGLE_GHA_CREDS_PATH
  if (keyFile) {
    core.info('Successfully authenticated')

    return new MetricExporter({
      projectId: inputs.gcpProjectId,
      keyFile,
    })
  } else {
    core.warning('No gcp credfile found, authenticate with `google-github-actions/auth`.')
  }

  return new MetricExporter({})
}

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
  console.log('Setting up telemetry...')

  const resource = new Resource({
    'service.namespace': 'github-actions',
    'service.name': 'collect-metrics',
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
