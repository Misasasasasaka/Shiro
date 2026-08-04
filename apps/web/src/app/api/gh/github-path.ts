const githubOwnerPattern = /^(?!-)[a-z\d-]{1,39}(?<!-)$/i
const githubRepositoryPattern = /^(?!\.{1,2}$)[\w.-]{1,100}$/
const githubNumberPattern = /^[1-9]\d*$/
const githubCommitPattern = /^[a-f\d]{7,40}$/i

const proxyPrefix = '/api/gh/'

export const getAllowedGitHubPath = (pathname: string) => {
  if (!pathname.startsWith(proxyPrefix)) return null

  const segments = pathname.slice(proxyPrefix.length).split('/')
  const [resource, owner, repository, detailType, detailId] = segments

  if (
    resource !== 'repos' ||
    !owner ||
    !githubOwnerPattern.test(owner) ||
    !repository ||
    !githubRepositoryPattern.test(repository)
  ) {
    return null
  }

  if (segments.length === 3) return segments.join('/')
  if (segments.length !== 5 || !detailType || !detailId) return null

  const isAllowedDetail =
    ((detailType === 'issues' ||
      detailType === 'pulls' ||
      detailType === 'discussions') &&
      githubNumberPattern.test(detailId)) ||
    (detailType === 'commits' && githubCommitPattern.test(detailId))

  return isAllowedDetail ? segments.join('/') : null
}
