'use client'

import type { SubscribeTypeToBitMap } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import type { FC, FormEventHandler } from 'react'
import { useEffect, useReducer, useState } from 'react'

import { IcBaselineTelegram } from '~/components/icons/platform/Telegram'
import { StyledButton } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input/Input'
import { useStateToRef } from '~/hooks/common/use-state-ref'
import { registerPushWorker } from '~/lib/push-worker'
import { apiClient } from '~/lib/request'
import { toast } from '~/lib/toast'
import {
  useAggregationSelector,
  useAppConfigSelector,
} from '~/providers/root/aggregation-data-provider'

import { useSubscribeStatusQuery } from './hooks'

interface SubscribeModalProps {
  onConfirm: () => void
  defaultTypes?: (keyof typeof SubscribeTypeToBitMap)[]
}

const subscribeTextKeys: Record<string, string> = {
  post_c: 'type_post',
  note_c: 'type_note',
  say_c: 'type_say',
  recently_c: 'type_recently',
}

const initialState = {
  email: '',
  types: {
    post_c: false,
    note_c: false,
    say_c: false,
    recently_c: false,
  },
}

type Action =
  | { type: 'set'; data: Partial<typeof initialState> }
  | { type: 'reset' }

const useFormData = () => {
  const [state, dispatch] = useReducer(
    (state: typeof initialState, payload: Action) => {
      switch (payload.type) {
        case 'set': {
          return { ...state, ...payload.data }
        }
        case 'reset': {
          return initialState
        }
      }
    },
    { ...initialState },
  )
  return [state, dispatch] as const
}

export const SubscribeModal: FC<SubscribeModalProps> = ({
  onConfirm,
  defaultTypes,
}) => {
  const t = useTranslations('subscribe')
  const [state, dispatch] = useFormData()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stateRef = useStateToRef(state)

  useEffect(() => {
    if (!defaultTypes || defaultTypes.length === 0) {
      return
    }

    dispatch({
      type: 'set',
      data: {
        types: defaultTypes.reduce(
          (acc, type) => {
            // @ts-ignore
            acc[type] = true
            return acc
          },
          { ...stateRef.current.types },
        ),
      },
    })
  }, [])

  useEffect(() => {
    registerPushWorker()
  }, [])

  const { data: status } = useSubscribeStatusQuery()
  const types = (
    Object.keys(state.types) as (keyof typeof state.types)[]
  ).filter((type) => status?.allowTypes.includes(type))
  const selectedTypes = types.filter((type) => state.types[type])
  const email = state.email.trim()

  const handleSubList: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!status?.enable) {
      toast.error(t('not_enabled'))
      return
    }
    if (!email || selectedTypes.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    try {
      await apiClient.subscribe.subscribe(email, selectedTypes)
    } catch {
      toast.error(t('request_failed'))
      return
    } finally {
      setIsSubmitting(false)
    }

    // Core 14 subscribes immediately. Core 18 requests confirmation, but
    // uses the same empty HTTP response even when it suppresses a resend.
    toast.success(t('request_received'))
    dispatch({ type: 'reset' })
    onConfirm()
  }
  const title = useAggregationSelector((data) => data.seo.title)
  const tg = useAppConfigSelector((data) => data.module.subscription.tg)

  return (
    <form onSubmit={handleSubList} className="flex flex-col gap-5">
      <p className="text-sm">{t('welcome', { title: title || '' })}</p>
      <Input
        type="email"
        placeholder={t('form_email')}
        required
        value={state.email}
        onChange={(e) => {
          dispatch({ type: 'set', data: { email: e.target.value } })
        }}
      />
      <div className="mb-2 flex gap-10">
        {types.map((name) => (
          <fieldset
            className="children:cursor-pointer inline-flex items-center text-sm"
            key={name}
          >
            <Checkbox
              id={name}
              checked={state.types[name]}
              onCheckedChange={(v) => {
                if (typeof v === 'boolean') {
                  dispatch({
                    type: 'set',
                    data: {
                      types: {
                        ...state.types,
                        [name]: v,
                      },
                    },
                  })
                }
              }}
            />
            <label htmlFor={name}>{t(subscribeTextKeys[name])}</label>
          </fieldset>
        ))}
      </div>

      <p className="-mt-2 text-sm">
        {t('rss_hint')}{' '}
        <a
          href="/feed"
          className="text-accent underline"
          target="_blank"
          rel="noreferrer"
        >
          /feed
        </a>{' '}
        {t('rss_suffix', { title: title || '' })}
      </p>
      {tg && (
        <p className="flex items-center gap-2 text-sm">
          {t('telegram_hint')}{' '}
          <a
            href={`https://t.me/${tg.replace('@', '')}`}
            className="center flex gap-1 text-accent underline"
            target="_blank"
          >
            <IcBaselineTelegram className="text-lg text-[#2AABEE]" />
            <span>{tg}</span>
          </a>
        </p>
      )}
      <div className="flex justify-end">
        <StyledButton
          type="submit"
          disabled={
            !status?.enable ||
            !email ||
            selectedTypes.length === 0 ||
            isSubmitting
          }
          isLoading={isSubmitting}
        >
          {t('submit')}
        </StyledButton>
      </div>
    </form>
  )
}
