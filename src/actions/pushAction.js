/* @flow */

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type {AppDescription} from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  description: AppDescription;
  /* jscs:enable disallowSemicolons */

  constructor(description: AppDescription) {
    this.description = description
  }

  describe(): Array<string> {
    return [`deploy ${this.description.version}`]
  }

  run(dokku: Dokku, repoCache: RepoCache): Promise {
    const stopApp = this.description.stopBeforeDeployment
      ? dokku.stop(this.description.name)
      : Promise.resolve()

    const { ORIGIN_REMOTE, DOKKU_REMOTE } = repoCache

    return stopApp
      .then(() => repoCache.getRepo(this.description.name))
      .then((repo) => repo.ensureRemote(ORIGIN_REMOTE, this.description.repo))
      .then((repo) => repo.fetch(ORIGIN_REMOTE))
      .then((repo) => repo.push(DOKKU_REMOTE, `${this.description.version}:refs/heads/master`))
  }
}
