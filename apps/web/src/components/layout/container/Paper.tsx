import type { JSX } from 'react'

import { clsxm } from '~/lib/helper'

export const Paper: Component<{
  as?: keyof JSX.IntrinsicElements | Component
  mobileInset?: boolean
}> = ({ children, className, as: As = 'main', mobileInset = false }) => (
  <As
    className={clsxm(
      'content-paper relative md:col-start-1 lg:col-auto',
      mobileInset
        ? 'mx-2 px-5 py-8 md:m-0 md:p-[2rem_1rem] lg:p-[30px_45px]'
        : '-m-4 p-[2rem_1rem] md:m-0 lg:p-[30px_45px]',
      'note-layout-main',
      'min-w-0',
      'print:border-none! print:bg-transparent! print:shadow-none!',
      className,
    )}
  >
    {children}
  </As>
)
