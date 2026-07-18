'use client'

import { atom, useAtomValue } from 'jotai'
import { selectAtom } from 'jotai/utils'
import type { DependencyList, FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useRef } from 'react'

import { setWebUrl } from '~/atoms'
import { useBeforeMounted } from '~/hooks/common/use-before-mounted'
import { isDev } from '~/lib/env'
import { jotaiStore } from '~/lib/store'
import type { SiteRootData } from '~/types/site'

export type { SiteRootData }

export const aggregationDataAtom = atom<null | SiteRootData>(null)
const appConfigAtom = atom<AppConfig | null>(null)

export const AggregationProvider: FC<
  PropsWithChildren<{
    aggregationData: SiteRootData
    appConfig: AppConfig
  }>
> = ({ children, aggregationData, appConfig }) => {
  useBeforeMounted(() => {
    if (!aggregationData) return
    jotaiStore.set(aggregationDataAtom, aggregationData)
    setWebUrl(aggregationData.url.webUrl)
  })
  useBeforeMounted(() => {
    if (!appConfig) return
    jotaiStore.set(appConfigAtom, appConfig)
  })
  // useHydrateAtoms(
  //   [
  //     [aggregationDataAtom, aggregationData],
  //     [appConfigAtom, appConfig],
  //   ],
  //   {
  //     dangerouslyForceHydrate: true,
  //   },
  // )

  useEffect(() => {
    if (!appConfig) return
    jotaiStore.set(appConfigAtom, appConfig)
  }, [appConfig])

  useEffect(() => {
    if (!aggregationData) return
    jotaiStore.set(aggregationDataAtom, aggregationData)
    setWebUrl(aggregationData.url.webUrl)
  }, [aggregationData])

  const callOnceRef = useRef(false)

  useEffect(() => {
    if (callOnceRef.current) return
    if (!aggregationData?.user) return
    callOnceRef.current = true
  }, [aggregationData?.user])

  return children
}

export const useAggregationSelector = <T,>(
  selector: (atomValue: SiteRootData) => T,
  deps: DependencyList = [],
): T | null =>
  useAtomValue(
    selectAtom(
      aggregationDataAtom,
      useCallback(
        (atomValue) => (!atomValue ? null : selector(atomValue)),
        deps,
      ),
    ),
  )

export const useAppConfigSelector = <T,>(
  selector: (atomValue: AppConfig) => T,
  deps: DependencyList = [],
): T | null =>
  useAtomValue(
    selectAtom(
      appConfigAtom,
      useCallback(
        (atomValue) => (!atomValue ? null : runSelector(selector, atomValue)),
        deps,
      ),
    ),
  )

export const getAggregationData = () => jotaiStore.get(aggregationDataAtom)

export const getAppConfig = () => jotaiStore.get(appConfigAtom)

export const useCanComment = () =>
  useAggregationSelector(
    (data) => data.commentOptions?.disableComment !== true,
  ) ?? false

const runSelector = <T,>(
  selector: (value: AppConfig) => T,
  value: AppConfig,
) => {
  try {
    return selector(value)
  } catch (error: unknown) {
    if (isDev) console.error(error)
    return null
  }
}
