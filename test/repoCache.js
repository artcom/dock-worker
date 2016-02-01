/* eslint-env mocha */

import bluebird from "bluebird"
import cp from "child_process"
import chai, {expect} from "chai"
import chaiAsPromised from "chai-as-promised"
import path from "path"
import tmp from "tmp"

import RepoCache from "../src/repoCache"

chai.use(chaiAsPromised)

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
        this.cache = new RepoCache(this.repoDir, { cacheDir, protocol: "file" })
      })
    ])
  })

  it("should set environment remote", function() {
    const remotes = this.cache.getRepo("app1")
      .then((repo) => repo.remotes())

    return expect(remotes).to.eventually.deep.equal({
      dokku: {
        fetch: `file://${this.repoDir}/app1`,
        push: `file://${this.repoDir}/app1`
      }
    })
  })
})
