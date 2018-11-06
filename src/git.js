/* @flow */

import bluebird from "bluebird"
import cp from "child_process"
import fs from "fs"
import path from "path"
import set from "lodash/set"

const execFileAsync = bluebird.promisify(cp.execFile)
const statAsync = bluebird.promisify(fs.stat)

type RepoOptions = {
  bare?: boolean
}

type Remotes = {[key: string]: {
  fetch: string,
  push: string
}}

class Repo {
  directory: string;

  constructor(directory: string, bare: boolean = false) {
    this.directory = bare ? directory : path.join(directory, ".git")
  }

  fetch(remote: string): Promise<Repo> {
    return this.git("fetch", remote).then(() => this)
  }

  push(remote: string, refspec: string): Promise<Repo> {
    return this.git("push", remote, refspec).then(() => this)
  }

  ensureRemote(remote: string, url: string) {
    return this.remotes().then(remotes => {
      if (remotes[remote]) {
        return this.setRemoteUrl(remote, url)
      } else {
        return this.addRemote(remote, url)
      }
    })
  }

  remotes(): Promise<Remotes> {
    return this.git("remote", "--verbose").then(lines =>
      lines.reduce((remotes, line) => {
        const match = line.match(remoteLine)

        if (match) {
          const [, remote, url, type] = match
          set(remotes, [remote, type], url)
        }

        return remotes
      }, {})
    )
  }

  addRemote(remote: string, url: string) {
    return this.git("remote", "add", remote, url).then(() => this)
  }

  setRemoteUrl(remote: string, url: string) {
    return this.git("remote", "set-url", remote, url).then(() => this)
  }

  showRef(ref: string) {
    return this.git("show-ref", ref).then(lines => lines[0].split(" ")[0])
  }

  // PRIVATE

  git(...params: Array<string>): Promise<Array<string>> {
    return git(`--git-dir=${this.directory}`, ...params)
  }
}

export type RepoType = Repo

export function repo(directory: string, options: RepoOptions = {}): Promise<Repo> {
  if (options.bare) {
    return statAsync(path.join(directory, "HEAD")).then(stats => {
      if (stats.isFile()) {
        return new Repo(directory, true)
      } else {
        throw new Error(`Not a bare git repo: ${directory}`)
      }
    })
  } else {
    return statAsync(path.join(directory, ".git")).then(stats => {
      if (stats.isDirectory()) {
        return new Repo(path.join(directory))
      } else {
        throw new Error(`Not a git repo: ${directory}`)
      }
    })
  }
}

export function init(directory: string, options: RepoOptions = {}): Promise<Repo> {
  const command = options.bare
    ? git("init", "--bare", directory)
    : git("init", directory)

  return command.then(() => new Repo(directory, options.bare))
}

export function clone(repo: string, directory: string, options: RepoOptions = {}): Promise<Repo> {
  const command = options.bare
    ? git("clone", "--bare", repo, directory)
    : git("clone", repo, directory)

  return command.then(() => new Repo(directory, options.bare))
}

function git(...params: Array<string>): Promise<Array<string>> {
  return execFileAsync("git", params, { maxBuffer: 2048 * 1024 }).then(stdout => {
    const lines = stdout.split("\n")
    return lines.filter(line => line.length > 0)
  })
}

const remoteLine = /^(\w+)\s+(.*)\s+\((fetch|push)\)$/
