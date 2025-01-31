import * as yaml from 'js-yaml'

export type WorkflowDefinition = {
  jobs: {
    [name: string]: {
      name?: string
      'runs-on'?: string
    }
  }
}

export const parseWorkflowFile = (s: string): WorkflowDefinition => {
  const parsed = yaml.load(s)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`workflow is not valid object: ${typeof parsed}`)
  }
  const workflow = parsed as WorkflowDefinition
  if (typeof workflow.jobs !== 'object') {
    throw new Error(`workflow does not have valid "jobs" field: ${JSON.stringify(workflow)}`)
  }
  return workflow
}

const getCanonicalJobName = (jobName: string) => jobName.replace(/ *\(.+?\)/, '')

export const inferRunner = (jobName: string, workflowDefinition?: WorkflowDefinition): string | undefined => {
  if (workflowDefinition === undefined) {
    return
  }
  const canonicalJobName = getCanonicalJobName(jobName)
  for (const k of Object.keys(workflowDefinition.jobs)) {
    const job = workflowDefinition.jobs[k]
    // exact match
    if (canonicalJobName === k || canonicalJobName === job.name) {
      return job['runs-on']
    }
    // consider expression(s) in name property
    if (job.name?.search(/\$\{\{.+?\}\}/)) {
      const pattern = `^${job.name
        .split(/\$\{\{.+?\}\}/)
        .map(escapeRegex)
        .join('.+?')}$`
      if (new RegExp(pattern).test(jobName)) {
        return job['runs-on']
      }
    }
  }
}

// https://github.com/tc39/proposal-regex-escaping
const escapeRegex = (s: string): string => s.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&')

export const parseJobName = (jobName: string) => {
  // service-checks (snakes, example) / run-plan-alerts / plan-or-deploy-alerts-dev
  // service-checks (greeter, example) / generate-validatex

  const canonicalJobName = getCanonicalJobName(jobName)

  const matchMatrixInputs = [...jobName.matchAll(/\(([^)]+)\)/g)]

  const result = { 'job.canonical_name': canonicalJobName }

  if (!matchMatrixInputs.length) {
    return result
  }

  const matrixInput = matchMatrixInputs[0][1]

  return { ...result, 'job.matrix': matrixInput }
}
