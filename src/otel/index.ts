import * as core from '@actions/core'

import { ExporterOptions, MetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { Resource } from '@opentelemetry/resources'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  PushMetricExporter,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics'
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
    'service.namespace': 'github-actions-metrics',
    'service.name': 'github-actions-metrics',
  })
  const meterProvider = new MeterProvider({
    // Create a resource. Fill the `service.*` attributes in with real values for your service.
    // GcpDetectorSync will add in resource information about the current environment if you are
    // running on GCP. These resource attributes will be translated to a specific GCP monitored
    // resource if running on GCP. Otherwise, metrics will be sent with monitored resource
    // `generic_task`.
    resource,
  })

  const exporter = createExporter(inputs)

  const reader = new PeriodicExportingMetricReader({
    exporter,
    // Export metrics every 10 seconds. 5 seconds is the smallest sample period allowed by
    // Cloud Monitoring.
    exportIntervalMillis: 10_000,
  })

  //   meterProvider.addMetricReader(new MetricReader())
  // Register the exporter
  //   meterProvider.addMetricReader(
  //     new PeriodicExportingMetricReader({
  //       // Export metrics every 10 seconds. 5 seconds is the smallest sample period allowed by
  //       // Cloud Monitoring.
  //       exportIntervalMillis: 10_000,
  //       exporter: new MetricExporter(),
  //     })
  //   )

  meterProvider.addMetricReader(reader)
  return meterProvider
}
