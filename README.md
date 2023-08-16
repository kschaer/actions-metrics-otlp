# actions-metrics-otlp [![ts](https://github.com/kschaer/actions-metrics-otlp/actions/workflows/ts.yaml/badge.svg)](https://github.com/kschaer/actions-metrics-otlp/actions/workflows/ts.yaml)

This action captures metrics on GitHub Actions using [OpenTelemetry](https://opentelemetry.io/). It is designed to help provide greater observability into the usage and performance of GitHub Workflows.

This project was originally forked from [int128/datadog-actions-metrics](https://github.com/int128/datadog-actions-metrics). 

## Overview

### How does it work?

When this action is triggered by a supported [event](#supported-events), it creates the OTEL resources necessary to collect and export metrics to the destination of your choosing (see supported exporters [supported exporters](#supported-exporters)
).
Various metrics are then created based on the content of the event, as well as additional data obtained via the GitHub API (OctoKit). 
Finally, the OTEL MeterProvider exports the metrics to the configured destination.

### Supported events:

- `workflow_run`

It ignores all other events.

The original repository supports additional events; these are not currently a priority for this fork (but contributions are welcome).

### Supported exporters:
- `gcp` - Google Cloud Platform
- `console` - No export - logs directly to your workflow logs.
- Contributions for additional exporters are welcome!
## Usage

To enable actions-metrics-otlp in your repository, add a new workflow to your repository wherever you typically store workflows - usually, this is the `.github/workflows` directory.
### Example usage - GCP
To collect workflow, job, and step metrics and ship to GCP:
Note - see [google-github-actions/auth](https://github.com/google-github-actions/auth) for more information about authentication options. This example uses [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation).

```yaml
name: Capture Workflow Metrics

on:
  workflow_run:
    workflows:
      - '**'
    types:
      - completed

jobs:
  capture-workflow-metrics:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      # needed for GCP auth
      contents: 'read'
      id-token: 'write'

      # needed for actions-metrics-otlp
      actions: 'read'
      checks: 'read'
      pull-requests: 'read'
    steps:
      - uses: 'actions/checkout@v3'
      - id: gcp-auth
        name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: your/workflow/identity/pool/provider
          service_account: your-service-account@email.address.com
      - id: capture-workflow-metrics
        name: Capture Workflow Metrics
        uses: kschaer/actions-metrics-otlp@v1
        with:
          collect-job-metrics: true
          collect-step-metrics: true
          parse-matrix-job-names: true
          exporter: 'gcp'
```

### Basic example usage - console
If you are not ready to export metrics externally, you can try out this action with the `console` exporter. Metrics will be `JSON.stringify`'d and printed to the workflow logs.

In this example, only workflow metrics are collected, so no additional permissions are specified.

```yaml
name: Capture Workflow Metrics

on:
  workflow_run:
    workflows:
      - '**'
    types:
      - completed

jobs:
  capture-workflow-metrics:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - id: capture-workflow-metrics
        name: Capture Workflow Metrics
        uses: kschaer/actions-metrics-otlp@v1
        with:
          exporter: 'console'

```

### All Options

| Option                   | Type    | Required? | Description                                                                                                                                       |
|--------------------------|---------|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `exporter`               | string  | Y         | The exporter used to ship your metrics. Supported values: "console", "gcp"                                                                        |
| `gcp-project-id`         | string  | N         | For use with "gcp" exporter. If not provided, the project ID is inferred from the credentials.                                                    |
| `collect-job-metrics`    | boolean | N         | Collects additional metrics on the individual jobs within your workflow.                                                                          |
| `collect-step-metrics`   | boolean | N         | Requires `collect-job-metrics`.  Collects additional metrics on the individual steps within your jobs.                                            |
| `parse-matrix-job-names` | boolean | N         | Requires `collect-job-metrics`. Useful if you have matrix-driven jobs. If true, your job names will be parsed and the "canonical" name extracted. |

# Metrics Collected
### Workflow run

This action sends the following metrics on workflow runs.

Note that `job` and `step` metrics are enabled via their respective options.


| Name                                          | Type      | Unit    | Requires option?       |
|-----------------------------------------------|-----------|---------|------------------------|
| `github.actions.workflow_run.total`           | Counter   |         |                        |
| `github.actions.workflow_run.duration`        | Histogram | Seconds |                        |
| `github.actions.workflow_run.queued_duration` | Histogram | Seconds |                        |
|                                               |           |         |                        |
| `github.actions.job.total`                    | Counter   |         | `collect-job-metrics`  |
| `github.actions.job.duration`                 | Histogram | Seconds | `collect-job-metrics`  |
|                                               |           |         |                        |
| `github.actions.step.total`                   | Counter   |         | `collect-step-metrics` |
| `github.actions.step.duration`                | Histogram | Seconds | `collect-step-metrics` |


Workflow run event metrics are collected with the following attributes: 

| Attribute name           | Type                |                                        | Info                                                                                                                                                         |
|--------------------------|---------------------|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| repository.owner         | string              |                                        |                                                                                                                                                              |
| repository.name          | string              |                                        |                                                                                                                                                              |
| event.sender             | string              |                                        |                                                                                                                                                              |
| event.sender_type        | string              |                                        |                                                                                                                                                              |
| branch.name              | string              |                                        |                                                                                                                                                              |
| branch.is_default        | boolean             |                                        |                                                                                                                                                              |
|                          |                     |                                        |                                                                                                                                                              |
| workflow_run.id          | number              |                                        |                                                                                                                                                              |
| workflow_run.name        | string              |                                        |                                                                                                                                                              |
| workflow_run.run_attempt | number              |                                        |                                                                                                                                                              |
| workflow_run.event       | string              |                                        |                                                                                                                                                              |
| workflow_run.conclusion  | string              |                                        | [WorkflowRunCompletedEvent["conclusion"]](https://github.com/octokit/webhooks/blob/ab83937fed1cbbecd7cabac2a2cdace8c7d36c86/payload-types/schema.d.ts#L8372) |
| __...job metrics - all of the above plus:__ |
| job.name                 | string              |                                        |                                                                                                                                                              |
| job.conclusion           | string              |                                        | [CheckConclusionState](https://docs.github.com/en/graphql/reference/enums#checkconclusionstate)                                                              |
| job.status               | string              |                                        | [CheckStatusState](https://docs.github.com/en/graphql/reference/enums#checkstatusstate)                                                                      |
| job.runs_on              | string \| undefined |                                        |                                                                                                                                                              |
| job.id                   | string              |                                        |                                                                                                                                                              |
| job.canonical_name       | string              | with option: `parse-matrix-job-names`  |                                                                                                                                                              |
| job.matrix               | string \| undefined | with option:  `parse-matrix-job-names` |                                                                                                                                                              |
| __...step metrics - all of the above plus:__ |
| step.name                | string              |                                        |                                                                                                                                                              |
| step.number              | number              |                                        |                                                                                                                                                              |
| step.conclusion          | string              |                                        | [CheckConclusionState](https://docs.github.com/en/graphql/reference/enums#checkconclusionstate)                                                              |
| step.status              | string              |                                        | [CheckStatusState](https://docs.github.com/en/graphql/reference/enums#checkstatusstate)                                                                      |
