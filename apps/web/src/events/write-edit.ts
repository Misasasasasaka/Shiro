import type { NoteModel, PostModel } from '@mx-space/api-client'

import { EmitKeyMap } from '~/constants/keys'

export class WriteEditEvent extends Event {
  static readonly type = EmitKeyMap.EditDataUpdate
  constructor(public readonly data: NoteModel | PostModel) {
    super(EmitKeyMap.EditDataUpdate)
  }
}
