/* @flow */

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type { AppDescription } from "../types"

export default class {
  description: AppDescription;

  constructor(description: AppDescription) {
    this.description = description
  }

  describe(): Array<string> {
    return [`deploy ${this.description.version}`]
  }

  async run(dokku: Dokku, repoCache: RepoCache): Promise {
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
