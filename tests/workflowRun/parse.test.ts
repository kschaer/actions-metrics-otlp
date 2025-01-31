import { inferRunner, parseJobName, parseWorkflowFile, WorkflowDefinition } from '../../src/workflowRun/parse'

test('parseWorkflowFile', () => {
  const workflowDefinition = parseWorkflowFile(`
jobs:
  ts:
    runs-on: ubuntu-latest
`)
  expect(workflowDefinition).toStrictEqual<WorkflowDefinition>({
    jobs: {
      ts: {
        'runs-on': 'ubuntu-latest',
      },
    },
  })
})

describe('inferRunner looks up a key', () => {
  const workflowDefinition: WorkflowDefinition = {
    jobs: {
      ts: {
        'runs-on': 'ubuntu-latest',
      },
    },
  }

  test('simple name', () => {
    const runner = inferRunner('ts', workflowDefinition)
    expect(runner).toBe('ubuntu-latest')
  })
  test('matrix job name', () => {
    const runner = inferRunner('ts (1, 2, 3)', workflowDefinition)
    expect(runner).toBe('ubuntu-latest')
  })
  test('not found', () => {
    const runner = inferRunner('foo', workflowDefinition)
    expect(runner).toBeUndefined()
  })
})

describe('inferRunner looks up name property', () => {
  const workflowDefinition: WorkflowDefinition = {
    jobs: {
      ts: {
        name: 'typescript build',
        'runs-on': 'ubuntu-latest',
      },
    },
  }

  test('simple name', () => {
    const runner = inferRunner('typescript build', workflowDefinition)
    expect(runner).toBe('ubuntu-latest')
  })
  test('matrix job name', () => {
    const runner = inferRunner('typescript build (1, 2, 3)', workflowDefinition)
    expect(runner).toBe('ubuntu-latest')
  })
  test('not found', () => {
    const runner = inferRunner('foo', workflowDefinition)
    expect(runner).toBeUndefined()
  })
})

describe('inferRunner looks up name with expression', () => {
  const workflowDefinition: WorkflowDefinition = {
    jobs: {
      foo: {
        name: 'test / ${{ matrix.x }} / ${{ matrix.y }}',
        'runs-on': 'self-hosted',
      },
      bar: {
        'runs-on': 'ubuntu-latest',
      },
    },
  }

  test('matrix job name', () => {
    const runner = inferRunner('test / 32 / true', workflowDefinition)
    expect(runner).toBe('self-hosted')
  })
  test('not found', () => {
    const runner = inferRunner('baz', workflowDefinition)
    expect(runner).toBeUndefined()
  })
})

describe('parseJobName', () => {
  const testCases = [
    {
      input: 'normal-name',
      expected: {
        'job.canonical_name': 'normal-name',
      },
    },
    {
      input: 'normal-name / composite',
      expected: {
        'job.canonical_name': 'normal-name / composite',
      },
    },
    {
      input: 'matrix (foo, bar) / name',
      expected: {
        'job.canonical_name': 'matrix / name',
        'job.matrix': 'foo, bar',
      },
    },
    {
      input: 'matrix (foo, bar) / name / composite',
      expected: {
        'job.canonical_name': 'matrix / name / composite',
        'job.matrix': 'foo, bar',
      },
    },
  ]

  it.each(testCases)('parses job name $input', ({ input, expected }) => {
    const result = parseJobName(input)
    expect(result).toEqual(expected)
  })
})
