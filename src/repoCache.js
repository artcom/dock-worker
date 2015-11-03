import bluebird from "bluebird"
import nodegit from "nodegit"
import keychain from "keychain"
import path from "path"
import url from "url"

const getPasswordAsync = bluebird.promisify(keychain.getPassword).bind(keychain)

export default class {
  constructor(cacheDir, user) {
    this.cacheDir = cacheDir
    this.user = user
  }

  getRepo(service) {
    const localPath = path.join(this.cacheDir, service.name)
    const host = url.parse(service.repo).hostname

    return getPasswordAsync({
      account: this.user,
      service: host,
      type: "internet" })
    .then((password) => {
      const fetchOpts = {
        callbacks: {
          credentials: () => nodegit.Cred.userpassPlaintextNew(this.user, password)
        }
      }

      return nodegit.Repository.openBare(localPath).then(
        (repo) => repo.fetch("origin", fetchOpts).then(() => repo),
        () => nodegit.Clone.clone(service.repo, localPath, { bare: 1, fetchOpts })
      )
    })
  }
}
