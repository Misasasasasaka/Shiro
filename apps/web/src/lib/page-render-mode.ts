/** This is page metadata, not the Core response envelope's metadata. */
export const isStandaloneHtmlPage = (page: {
  meta?: Record<string, unknown> | null
}) => page.meta?.render === 'html'
