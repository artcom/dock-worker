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

  it("should throw when credentials are not found", function() {
    const service = {
      name: "dokku-app",
      repo: `file://${this.repoDir}/source-code`
    }

    const environment = {
      name: "test",
      host: this.repoDir,
      protocol: "file",
      username: null
    }

    return this.cache.getRepo(service, environment).then((repo) =>
      Promise.all([
        repo.getRemote("origin").then((remote) => {
          expect(remote.url()).to.equal(`file://${this.repoDir}/source-code`)
        }),
        repo.getRemote("test").then((remote) => {
          expect(remote.url()).to.equal(`file://${this.repoDir}/dokku-app`)
        })
      ])
    )
  })
})
