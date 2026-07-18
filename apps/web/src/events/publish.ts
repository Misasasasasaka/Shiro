import type { NoteModel, PostModel } from '@mx-space/api-client'

import { EmitKeyMap } from '~/constants/keys'

export class PublishEvent extends Event {
  static readonly type = EmitKeyMap.Publish
  constructor(public readonly data: NoteModel | PostModel) {
    super(EmitKeyMap.Publish)
  }
}
