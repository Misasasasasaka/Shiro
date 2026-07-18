import { apiClient } from '~/lib/request'
import type { PostDetail } from '~/types/content'

import { defineQuery } from '../helper'

export type PostWithTranslation = PostDetail

export const post = {
  bySlug: (category: string, slug: string, lang?: string) =>
    defineQuery({
      queryKey: ['post', category, slug, lang],

      queryFn: async ({ queryKey }) => {
        const [, category, slug, lang] = queryKey as [
          string,
          string,
          string,
          string | undefined,
        ]

        const data = await apiClient.post.getPost(category, slug, {
          lang: lang || undefined,
          prefer: 'lexical',
        })

        return data as PostWithTranslation
      },
    }),
}
