import { describe, expect, it } from 'vitest'

import {
  buildLanguageAlternates,
  getSupportedLocalesFromTranslations,
} from './hreflang'

describe('content language alternates', () => {
  it('builds hreflang links from Core 18 language tags', () => {
    const locales = getSupportedLocalesFromTranslations({
      sourceLang: 'zh-CN',
      availableTranslations: ['ja-JP', 'en-US', 'en-GB'],
    })

    expect(buildLanguageAlternates('/posts/general/example', locales)).toEqual({
      'zh-CN': '/posts/general/example',
      en: '/en/posts/general/example',
      ja: '/ja/posts/general/example',
    })
  })

  it('preserves Core 14 language codes and the missing-source fallback', () => {
    expect(
      getSupportedLocalesFromTranslations({
        availableTranslations: ['ja', 'en'],
      }),
    ).toEqual(['zh', 'en', 'ja'])
  })

  it('skips unsupported scripts, languages and malformed tags', () => {
    expect(
      getSupportedLocalesFromTranslations({
        sourceLang: 'zh-TW',
        availableTranslations: ['zh-HK', 'fr-FR', 'invalid tag', 'EN-gb'],
      }),
    ).toEqual(['en'])
  })
})
