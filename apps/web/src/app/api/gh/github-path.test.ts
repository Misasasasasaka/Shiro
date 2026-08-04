import { describe, expect, it } from 'vitest'

import { getAllowedGitHubPath } from './github-path'

describe('getAllowedGitHubPath', () => {
  it.each([
    '/api/gh/repos/owner/repo',
    '/api/gh/repos/owner/repo/issues/123',
    '/api/gh/repos/owner/repo/pulls/123',
    '/api/gh/repos/owner/repo/commits/deadBEEF',
    '/api/gh/repos/owner/repo/discussions/123',
  ])('allows the public resources used by link cards', (path) => {
    expect(getAllowedGitHubPath(path)).toBe(path.slice('/api/gh/'.length))
  })

  it.each([
    '/api/gh/user',
    '/api/gh/user/repos',
    '/api/gh/orgs/example/repos',
    '/api/gh/repos/owner/repo/issues',
    '/api/gh/repos/owner/repo/actions/secrets',
    '/api/gh/repos/owner/repo%2Factions%2Fsecrets',
  ])('rejects endpoints outside the allowlist', (path) => {
    expect(getAllowedGitHubPath(path)).toBeNull()
  })
})
