import { describe, expect, it } from 'vitest'

import en from './en/common.json'
import ja from './ja/common.json'
import zh from './zh/common.json'

describe('default loading copy', () => {
  it.each([
    ['zh', zh.loading_default, '别着急，坐和放宽'],
    ['en', en.loading_default, 'Take it easy, sit back and relax'],
    ['ja', ja.loading_default, 'ゆっくりしていってね'],
  ])(
    'keeps the %s fallback as a single string',
    (_locale, actual, expected) => {
      expect(actual).toBe(expected)
    },
  )
})
