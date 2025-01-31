import * as github from '@actions/github'
import * as core from '@actions/core'

import { v1 } from '@datadog/datadog-api-client'
import mockConsole from 'jest-mock-console'

import { run } from '../src/run'
import { exampleWorkflowRunCompletedEvent } from './fixtures'
import { exampleRateLimitResponse } from './rateLimit/fixtures'
import { exampleCompletedCheckSuite } from './workflowRun/fixtures/completedCheckSuite'
import { examplePullRequestClosedEvent } from './fixtures'
import { WebhookPayload } from '@actions/github/lib/interfaces'
import { examplePullRequestOpenedEvent } from './fixtures'
import { exampleClosedPullRequestQuery } from './pullRequest/fixtures/closedPullRequest'
import { ActionsConsoleMetricExporter } from '../src/otel/actionsExporter'

// jest.mock('@actions/core')

jest.mock('@actions/github')
const octokitMock = {
  graphql: jest.fn(),
  rest: {
    rateLimit: {
      get: jest.fn(),
    },
  },
}
const getOctokit = github.getOctokit as jest.Mock
getOctokit.mockReturnValue(octokitMock)

beforeAll(() => {
  // this ensures timestamps in snapshots remain static
  jest.useFakeTimers({ now: new Date(Date.UTC(2023, 7, 11)) })
})

afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

test('workflow_run with collectJobMetrics', async () => {
  octokitMock.graphql.mockResolvedValue(exampleCompletedCheckSuite)
  octokitMock.rest.rateLimit.get.mockResolvedValue(exampleRateLimitResponse)

  const exporterSpy = jest.spyOn(ActionsConsoleMetricExporter.prototype, 'export')

  await run(
    {
      eventName: 'workflow_run',
      payload: exampleWorkflowRunCompletedEvent,
      repo: { owner: 'Codertocat', repo: 'Hello-World' },
    },
    {
      githubToken: 'GITHUB_TOKEN',
      githubTokenForRateLimitMetrics: 'GITHUB_TOKEN',
      collectJobMetrics: true,
      collectStepMetrics: true,
      parseMatrixJobNames: false,
      exporter: 'console',
    }
  )
  expect(getOctokit).toHaveBeenCalledWith('GITHUB_TOKEN')
  expect(exporterSpy.mock.calls).toMatchSnapshot()
})

test('workflow_run', async () => {
  const exporterSpy = jest.spyOn(ActionsConsoleMetricExporter.prototype, 'export')

  await run(
    {
      eventName: 'workflow_run',
      payload: exampleWorkflowRunCompletedEvent,
      repo: { owner: 'Codertocat', repo: 'Hello-World' },
    },
    {
      githubToken: 'GITHUB_TOKEN',
      githubTokenForRateLimitMetrics: 'GITHUB_TOKEN',
      collectJobMetrics: false,
      collectStepMetrics: false,
      parseMatrixJobNames: false,
      exporter: 'console',
    }
  )

  expect(exporterSpy.mock.calls).toMatchSnapshot()
})
