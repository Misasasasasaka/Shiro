import type {
  NoteResponseMeta,
  NoteWrappedPayload,
  PageModel,
  PostModel,
  PostResponseMeta,
  ResponseMeta,
} from '@mx-space/api-client'
import { metaFor } from '@mx-space/api-client'

type WithResponseMeta<T, Meta extends ResponseMeta> = T & {
  readonly $meta?: Meta
}

export type PostDetail = WithResponseMeta<PostModel, PostResponseMeta>
export type NoteDetail = WithResponseMeta<NoteWrappedPayload, NoteResponseMeta>
export type PageDetail = WithResponseMeta<PageModel, ResponseMeta>
export type ContentDetail = PostDetail | NoteDetail | PageDetail

export const contentMetaFor = (content: ContentDetail) =>
  metaFor(content, content.$meta)
