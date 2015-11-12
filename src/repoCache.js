/* @flow */

import _ from "lodash"
import path from "path"
import url from "url"

import * as git from "./git"

import type {Environment} from "./types"

class RepoCache {
  /* jscs:disable disallowSemicolons */
  cacheDir: string;
  /* jscs:enable disallowSemicolons */

  constructor(cacheDir: string = ".cache") {
    this.cacheDir = cacheDir
  }

  getRepo(name: string, environment: Environment): Promise {
    const localPath = path.resolve(this.cacheDir, name)

    return git.repo(localPath, { bare: true }).catch(
      () => git.init(localPath, { bare: true })
    ).then((repo) => {
      const remoteUrl = url.format({
        slashes: true,
        protocol: environment.protocol,
        auth: environment.username,
        host: environment.host,
        pathname: "/" + name
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
