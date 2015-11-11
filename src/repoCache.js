/* @flow */

import _ from "lodash"
import path from "path"
import url from "url"

import * as git from "./git"

import type {Environment, ServiceConfig} from "./types"

class RepoCache {
  /* jscs:disable disallowSemicolons */
  cacheDir: string;
  /* jscs:enable disallowSemicolons */

  constructor(cacheDir: string = ".cache") {
    this.cacheDir = cacheDir
  }

  getRepo(service: ServiceConfig, environment: Environment): Promise {
    const localPath = path.resolve(this.cacheDir, service.name)

    return git.repo(localPath, { bare: true }).catch(
      () => git.init(localPath, { bare: true })
    ).then((repo) =>
      repo.ensureRemote("origin", service.repo)
    ).then((repo) => {
      const remoteUrl = url.format({
        slashes: true,
        protocol: environment.protocol,
        auth: environment.username,
        host: environment.host,
        pathname: "/" + service.name
      })

      return repo.ensureRemote(environment.name, remoteUrl)
    })
  }
}

export default {
  get: _.memoize(function(cacheDir?: string) {
    return new RepoCache(cacheDir)
  })
}
