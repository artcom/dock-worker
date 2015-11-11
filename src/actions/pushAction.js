/* @flow */

import colors from "colors/safe"

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
    const repoCache = new RepoCache()

    return repoCache.getRepo(this.config, environment)
      .then((repo) => repo.fetch("origin"))
      .then((repo) => repo.push(environment.name, `${this.config.version}:refs/heads/master`))
  }
}
