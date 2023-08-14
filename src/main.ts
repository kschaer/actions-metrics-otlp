import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from './run'

const main = async (): Promise<void> => {
  await run(github.context, {
    githubToken: core.getInput('github-token', { required: true }),
    githubTokenForRateLimitMetrics: core.getInput('github-token-rate-limit-metrics', { required: true }),

    collectJobMetrics: core.getBooleanInput('collect-job-metrics'),
    collectStepMetrics: core.getBooleanInput('collect-step-metrics'),

    gcpProjectId: core.getInput('gcp-project-id'),
    exporter: core.getInput('exporter'),
  })
}

main().catch((e) => core.setFailed(e instanceof Error ? e : String(e)))
