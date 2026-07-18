'use client'

import { createModelDataProvider } from 'jojoo/react'

import { isClientSide, isDev } from '~/lib/env'
import type { PostDetail } from '~/types/content'

type PostWithTranslation = PostDetail

const {
  ModelDataProvider,
  ModelDataAtomProvider,
  getGlobalModelData,
  setGlobalModelData,
  useSetModelData,
  useModelDataSelector,
} = createModelDataProvider<PostWithTranslation>()

declare global {
  interface Window {
    getModelPostData: typeof getGlobalModelData
  }
}
if (isDev && isClientSide) window.getModelPostData = getGlobalModelData

export {
  ModelDataAtomProvider as CurrentPostDataAtomProvider,
  ModelDataProvider as CurrentPostDataProvider,
  getGlobalModelData as getGlobalCurrentPostData,
  setGlobalModelData as setGlobalCurrentPostData,
  useModelDataSelector as useCurrentPostDataSelector,
  useSetModelData as useSetCurrentPostData,
}
