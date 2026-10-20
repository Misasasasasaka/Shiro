import type { NoteModel, PostModel } from '@mx-space/api-client'

import { apiClient } from './request'

/** Adapt the rich renderer's article paths to Core's V3 detail endpoints. */
export async function fetchMxSpaceLinkCard(path: string) {
  const [type, first, second, ...rest] = path.replace(/^\/+/, '').split('/')
  let article: NoteModel | PostModel

  if (type === 'posts' && first && second && rest.length === 0) {
    article = await apiClient.post.getPost(first, second)
  } else if (
    type === 'notes' &&
    /^\d+$/.test(first ?? '') &&
    second === undefined &&
    Number.isSafeInteger(Number(first)) &&
    Number(first) > 0
  ) {
    article = await apiClient.note.getNoteByNid(Number(first))
  } else {
    throw new Error('Invalid Mix Space link card path')
  }

  // The renderer expects the article itself, not the Core response envelope.
  return { ...article, text: article.text ?? '' }
}
