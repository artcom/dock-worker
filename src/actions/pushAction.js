/* @flow */

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type {Environment, AppConfig} from "../types"

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

  run(environment: Environment): Promise {
    const dokku = new Dokku(environment)
    const repoCache = new RepoCache()

    const stopApp = this.config.stopBeforeDeployment
      ? dokku.stop(this.config.name)
      : Promise.resolve()

    return stopApp
      .then(() => repoCache.getRepo(this.config.name, environment))
      .then((repo) => repo.ensureRemote("origin", this.config.repo))
      .then((repo) => repo.fetch("origin"))
      .then((repo) => repo.push(environment.name, `${this.config.version}:refs/heads/master`))
  }
}
