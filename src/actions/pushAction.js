/* @flow */

import colors from "colors/safe"

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type {Environment, ServiceConfig} from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  config: ServiceConfig;
  /* jscs:enable disallowSemicolons */

  constructor(config: ServiceConfig) {
    this.config = config
  }

  describe(): Array<string> {
    return [colors.cyan(`deploy ${this.config.version}`)]
  }

  run(environment: Environment): Promise {
    const dokku = new Dokku(environment.host)
    const repoCache = RepoCache.get()

    const stopService = this.config.stopBeforeDeployment
      ? dokku.stop(this.config.name)
      : Promise.resolve()

    return stopService
      .then(() => repoCache.getRepo(this.config, environment))
      .then((repo) => repo.fetch("origin"))
      .then((repo) => repo.push(environment.name, `${this.config.version}:refs/heads/master`))
  }
}
