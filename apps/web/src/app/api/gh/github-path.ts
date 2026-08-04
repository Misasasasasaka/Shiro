/* eslint-disable regexp/prefer-d, regexp/prefer-w -- Keep GitHub path characters explicit. */
const repositoryPath = 'repos/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/[a-z0-9._-]+'
const allowedGitHubPaths = [
  new RegExp(`^${repositoryPath}$`, 'i'),
  new RegExp(`^${repositoryPath}/issues/[0-9]+$`, 'i'),
  new RegExp(`^${repositoryPath}/pulls/[0-9]+$`, 'i'),
  new RegExp(`^${repositoryPath}/commits/[0-9a-f]+$`, 'i'),
  new RegExp(`^${repositoryPath}/discussions/[0-9]+$`, 'i'),
]

export const getAllowedGitHubPath = (pathname: string) => {
  const path = pathname.split('/').slice(3).join('/')

  return allowedGitHubPaths.some((pattern) => pattern.test(path)) ? path : null
}
