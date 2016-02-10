/* @flow */

import path from "path"

import * as git from "./git"

export default class RepoCache {
  /* jscs:disable disallowSemicolons */
  ORIGIN_REMOTE: string;
  DOKKU_REMOTE: string;

  cacheDir: string;
  remoteUrl: string;
  /* jscs:enable disallowSemicolons */

  constructor(remoteUrl: string, options: { cacheDir?: string } = {}) {
    this.ORIGIN_REMOTE = "origin"
    this.DOKKU_REMOTE = "dokku"

    this.cacheDir = options.cacheDir || ".cache"
    this.remoteUrl = remoteUrl
  }

  getRepo(name: string): Promise {
    const localPath = path.resolve(this.cacheDir, name)

    return git.repo(localPath, { bare: true })
      .catch(() => git.init(localPath, { bare: true }))
      .then((repo) => repo.ensureRemote(this.DOKKU_REMOTE, `${this.remoteUrl}/${name}`))
  }
}
