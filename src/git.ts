import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import os from "os"
import path from "path"
import set from "lodash/set"

const execFileAsync = promisify(execFile)
const statAsync = promisify(fs.stat)
const mkdtempAsync = promisify(fs.mkdtemp)

type LogBetweenResult = {
  commits: string[]
  warning?: string
}

type RepoOptions = {
  bare?: boolean
}

type Remotes = {
  [key: string]: {
    fetch: string
    push: string
  }
}

class Repo {
  directory: string

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
    return this.remotes().then((remotes) => {
      if (remotes[remote]) {
        return this.setRemoteUrl(remote, url)
      } else {
        return this.addRemote(remote, url)
      }
    })
  }

  remotes(): Promise<Remotes> {
    return this.git("remote", "--verbose").then((lines) =>
      lines.reduce((remotes, line) => {
        const match = line.match(remoteLine)

        if (match) {
          const [, remote, url, type] = match
          set(remotes, [remote, type], url)
        }

        return remotes
      }, {}),
    )
  }

  addRemote(remote: string, url: string) {
    return this.git("remote", "add", remote, url).then(() => this)
  }

  setRemoteUrl(remote: string, url: string) {
    return this.git("remote", "set-url", remote, url).then(() => this)
  }

  showRef(ref: string) {
    return this.git("show-ref", ref).then((lines) => lines[0].split(" ")[0])
  }

  log(fromRef: string, toRef: string): Promise<string[]> {
    return this.git("log", "--pretty=format:%h %s", `${fromRef}..${toRef}`)
  }

  logRef(ref: string): Promise<string[]> {
    return this.git("log", "--pretty=format:%h %s", ref)
  }

  hasCommit(ref: string): Promise<boolean> {
    return this.git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`)
      .then(() => true)
      .catch(() => false)
  }

  // PRIVATE

  git(...params: Array<string>): Promise<Array<string>> {
    return git(`--git-dir=${this.directory}`, ...params)
  }
}

export type RepoType = Repo

export function repo(
  directory: string,
  options: RepoOptions = {},
): Promise<Repo> {
  if (options.bare) {
    return statAsync(path.join(directory, "HEAD")).then((stats) => {
      if (stats.isFile()) {
        return new Repo(directory, true)
      } else {
        throw new Error(`Not a bare git repo: ${directory}`)
      }
    })
  } else {
    return statAsync(path.join(directory, ".git")).then((stats) => {
      if (stats.isDirectory()) {
        return new Repo(path.join(directory))
      } else {
        throw new Error(`Not a git repo: ${directory}`)
      }
    })
  }
}

export function init(
  directory: string,
  options: RepoOptions = {},
): Promise<Repo> {
  const command = options.bare
    ? git("init", "--bare", directory)
    : git("init", directory)

  return command.then(() => new Repo(directory, options.bare))
}

export function clone(
  repo: string,
  directory: string,
  options: RepoOptions = {},
): Promise<Repo> {
  const command = options.bare
    ? git("clone", "--bare", repo, directory)
    : git("clone", repo, directory)

  return command.then(() => new Repo(directory, options.bare))
}

export function lsRemote(repo: string, ref: string): Promise<string | null> {
  return git("ls-remote", repo, ref).then((lines) => {
    if (lines.length === 0) {
      return null
    }

    return lines[0].split("\t")[0]
  })
}

export async function logBetween(
  repoUrl: string,
  fromRef: string,
  toRef: string,
): Promise<LogBetweenResult> {
  const tempDir = await mkdtempAsync(path.join(os.tmpdir(), "dock-worker-"))
  const localPath = path.join(tempDir, "repo.git")

  try {
    const clonedRepo = await clone(repoUrl, localPath, { bare: true })
    const hasToRef = await clonedRepo.hasCommit(toRef)

    if (!hasToRef) {
      throw new Error(`Could not find commit ${toRef} in ${repoUrl}`)
    }

    const hasFromRef = await clonedRepo.hasCommit(fromRef)

    if (!hasFromRef) {
      return {
        commits: await clonedRepo.logRef(toRef),
        warning: `Dockfile commit ${fromRef} was not found in the repository history. Showing full ${toRef} history instead.`,
      }
    }

    return {
      commits: await clonedRepo.log(fromRef, toRef),
    }
  } catch (error) {
    throw new Error(
      `Could not read commits between ${fromRef} and ${toRef} from ${repoUrl}: ${error.message}`,
    )
  } finally {
    await removeDirectoryRecursive(tempDir)
  }
}

async function removeDirectoryRecursive(directory: string): Promise<void> {
  await execFileAsync("rm", ["-rf", directory])
}

function git(...params: Array<string>): Promise<Array<string>> {
  return execFileAsync("git", params, { maxBuffer: 2048 * 1024 }).then(
    ({ stdout }) => {
      const lines = stdout.split("\n")
      return lines.filter((line) => line.length > 0)
    },
  )
}

const remoteLine = /^(\w+)\s+(.*)\s+\((fetch|push)\)$/
