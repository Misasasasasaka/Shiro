import { RequestError } from '@mx-space/api-client'
import type { FetchError } from 'ofetch'

export const getErrorMessageFromRequestError = (error: unknown) => {
  if (!(error instanceof RequestError)) {
    return error instanceof Error ? error.message : String(error)
  }
  const fetchError = error.raw as FetchError
  const messagesOrMessage = fetchError.response?._data?.message
  const bizMessage =
    typeof messagesOrMessage === 'string'
      ? messagesOrMessage
      : Array.isArray(messagesOrMessage)
        ? messagesOrMessage[0]
        : undefined

  return bizMessage || fetchError.message
}
