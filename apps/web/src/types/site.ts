import type { AggregateRootWithTheme, PageModel } from '@mx-space/api-client'

export interface SiteRootData extends AggregateRootWithTheme<AppThemeConfig> {
  pages: PageModel[]
}
