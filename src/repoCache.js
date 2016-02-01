/* @flow */

import path from "path"
import url from "url"

import * as git from "./git"

import type {Environment} from "./types"

export default class RepoCache {
  /* jscs:disable disallowSemicolons */
  ORIGIN_REMOTE: string;
  DOKKU_REMOTE: string;

  cacheDir: string;
  remoteUrl: string;
  /* jscs:enable disallowSemicolons */

  constructor(environment: Environment, cacheDir: string = ".cache") {
    this.ORIGIN_REMOTE = "origin"
    this.DOKKU_REMOTE = "dokku"

    this.cacheDir = cacheDir
    this.remoteUrl = url.format({
      slashes: true,
      protocol: environment.protocol,
      auth: environment.username,
      host: environment.host
    })
  }

  getRepo(name: string): Promise {
    const localPath = path.resolve(this.cacheDir, name)

    return git.repo(localPath, { bare: true })
      .catch(() => git.init(localPath, { bare: true }))
      .then((repo) => repo.ensureRemote(this.DOKKU_REMOTE, `${this.remoteUrl}/${name}`))
  }
}
