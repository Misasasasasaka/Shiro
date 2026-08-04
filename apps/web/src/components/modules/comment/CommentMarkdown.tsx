import type { FC } from 'react'

import { PrismHighLighter } from '~/components/ui/code-highlighter'
import { Markdown, RuleType } from '~/components/ui/markdown'
import { useTypeScriptHappyCallback } from '~/hooks/common/use-callback'

import { useCommentMarkdownContainerRefSetter } from './CommentProvider'

const disabledTypes = [
  RuleType.footnote,
  RuleType.footnoteReference,
  RuleType.htmlComment,
  RuleType.htmlSelfClosing,
  RuleType.htmlBlock,
]

const commentRenderers = {
  [RuleType.codeBlock]: {
    render(
      node: { lang?: string; text: string },
      _output: unknown,
      state: any,
    ) {
      return (
        <PrismHighLighter
          key={state?.key}
          content={node.text}
          lang={node.lang}
        />
      )
    },
  },
}

export const CommentMarkdown: FC<{
  children: string
}> = ({ children }) => {
  const setContainerRef = useCommentMarkdownContainerRefSetter()

  return (
    <div
      className="contents"
      ref={useTypeScriptHappyCallback(
        (ref) => setContainerRef(ref?.firstChild as HTMLDivElement),
        [setContainerRef],
      )}
    >
      <Markdown
        disableParsingRawHTML
        forceBlock
        disabledTypes={disabledTypes}
        renderers={commentRenderers}
        value={children}
        variant="comment"
      />
    </div>
  )
}
