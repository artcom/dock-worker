/* eslint-env mocha */

import bluebird from "bluebird"
import cp from "child_process"
import { expect } from "chai"
import path from "path"
import tmp from "tmp"
import url from "url"

import RepoCache from "../src/repoCache"

const execFileAsync = bluebird.promisify(cp.execFile)
const tmpDirAsync = bluebird.promisify(tmp.dir)

describe("Repo Cache", function() {
  beforeEach(async function() {
    this.repoDir = await tmpDirAsync({ unsafeCleanup: true })
    await execFileAsync("bash", [path.resolve(__dirname, "createRepos.sh"), this.repoDir])

    const cacheDir = await tmpDirAsync({ unsafeCleanup: true })
    const remoteUrl = url.format({ protocol: "file", host: this.repoDir })
    this.cache = new RepoCache(remoteUrl, { cacheDir })
  })

  it("should set environment remote", async function() {
    const repo = await this.cache.getRepo("app1")
    const remotes = await repo.remotes()

    expect(remotes).to.deep.equal({
      dokku: {
        fetch: `file://${this.repoDir}/app1`,
        push: `file://${this.repoDir}/app1`
      }
    })
  })
})
