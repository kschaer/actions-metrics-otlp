import * as core from '@actions/core'

import { MetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { PushMetricExporter } from '@opentelemetry/sdk-metrics'
import { ActionInputs } from '../types'

export const createGcpExporter = (inputs: ActionInputs): PushMetricExporter => {
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
