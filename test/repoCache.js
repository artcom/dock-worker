/* eslint-env mocha */

import bluebird from "bluebird"
import cp from "child_process"
import {expect} from "chai"
import path from "path"
import tmp from "tmp"

import RepoCache from "../src/repoCache"

const execFileAsync = bluebird.promisify(cp.execFile)
const tmpDirAsync = bluebird.promisify(tmp.dir)

describe("Repo Cache", function() {
  beforeEach(function() {
    return Promise.all([
      tmpDirAsync({ unsafeCleanup: true }).then((repoDir) => {
        this.repoDir = repoDir
        return execFileAsync("bash", [path.resolve(__dirname, "createRepos.sh"), repoDir])
      }),
      tmpDirAsync({ unsafeCleanup: true }).then((cacheDir) => {
        this.cache = new RepoCache(cacheDir)
      })
    ])
  })

  it("should set environment remote", function() {
    const environment = {
      name: "test",
      host: this.repoDir,
      protocol: "file",
      username: null
    }

    return this.cache.getRepo("dokku-app", environment)
      .then((repo) => repo.remotes())
      .then((remotes) => {
        expect(remotes).to.deep.equal({
          test: {
            fetch: `file://${this.repoDir}/dokku-app`,
            push: `file://${this.repoDir}/dokku-app`
          }
        })
      })
  })
})
