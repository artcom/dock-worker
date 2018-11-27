import Dokku from "../dokku"
import RepoCache from "../repoCache"

import { AppData } from "../appData"
import { AppDescription } from "../types"

export function needsPushAction(app: AppData): boolean {
  return app.description.version !== app.actual.version
}

export function makePushAction(app: AppData): PushAction {
  return new PushAction(app)
}

export function isPushAction(action: any) {
  return action instanceof PushAction
}

class PushAction {
  description: AppDescription;

  constructor(app: AppData) {
    this.description = app.description
  }

  describe(): Array<string> {
    return [`deploy ${this.description.version}`]
  }

  async run(dokku: Dokku, repoCache: RepoCache): Promise<void> {
    if (this.description.stopBeforeDeployment) {
      await dokku.stop(this.description.name)
    }

    const { ORIGIN_REMOTE, DOKKU_REMOTE } = repoCache

    const repo = await repoCache.getRepo(this.description.name)
    await repo.ensureRemote(ORIGIN_REMOTE, this.description.repo)
    await repo.fetch(ORIGIN_REMOTE)
    await repo.push(DOKKU_REMOTE, `${this.description.version}:refs/heads/master`)
  }
}
