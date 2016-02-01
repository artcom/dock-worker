/* @flow */

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type {AppConfig} from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  config: AppConfig;
  /* jscs:enable disallowSemicolons */

  constructor(config: AppConfig) {
    this.config = config
  }

  describe(): Array<string> {
    return [`deploy ${this.config.version}`]
  }

  run(dokku: Dokku, repoCache: RepoCache): Promise {
    const stopApp = this.config.stopBeforeDeployment
      ? dokku.stop(this.config.name)
      : Promise.resolve()

    return stopApp
      .then(() => repoCache.getRepo(this.config.name))
      .then((repo) => repo.ensureRemote(repoCache.ORIGIN_REMOTE, this.config.repo))
      .then((repo) => repo.fetch(repoCache.ORIGIN_REMOTE))
      .then((repo) => repo.push(repoCache.DOKKU_REMOTE, `${this.config.version}:refs/heads/master`))
  }
}
