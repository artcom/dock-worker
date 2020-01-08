import { spawnSync } from "child_process"
import path from "path"
import url from "url"

import tmp from "tmp"
import { expect } from "chai"

import RepoCache from "../src/repoCache"

describe("Repo Cache", () => {
  beforeEach(async () => {
    this.repoDir = tmp.dirSync({ unsafeCleanup: true }).name
    spawnSync("bash", [path.resolve(__dirname, "createRepos.sh"), this.repoDir])

    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name
    const remoteUrl = url.format({ protocol: "file", host: this.repoDir })
    this.cache = new RepoCache(remoteUrl, { cacheDir: tmpDir })
  })

  it("should set environment remote", async () => {
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
