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

  getRepo(service, environment) {
    const localPath = path.resolve(this.cacheDir, service.name)
    const host = url.parse(service.repo).hostname

    return getPasswordAsync({
      account: this.user,
      service: host,
      type: "internet" })
    .then((password) => {
      const sourceFetchOpts = {
        callbacks: {
          credentials: (repoUrl) => {
            console.log(repoUrl)
            return nodegit.Cred.userpassPlaintextNew(this.user, password)
          }
        }
      }

      const dokkuFetchOpts = {
        callbacks: {
          credentials: (repoUrl, user) => {
            console.log(repoUrl)
            return nodegit.Cred.sshKeyFromAgent(user)
          }
        }
      }

      return nodegit.Repository.openBare(localPath).then(
        (repo) => repo.fetch("origin", sourceFetchOpts).then(() => repo),
        () => nodegit.Clone.clone(service.repo, localPath, { bare: 1, fetchOpts: sourceFetchOpts })
      ).then((repo) => {
        const remoteUrl = `${environment.host}:${service.name}`
        return nodegit.Remote.lookup(repo, environment.name).then(
          () => nodegit.Remote.setUrl(repo, environment.name, remoteUrl),
          () => nodegit.Remote.create(repo, environment.name, remoteUrl)
        ).then(() => repo)
      }).then((repo) =>
        repo.fetch(environment.name, dokkuFetchOpts).then(() => repo)
      )
    })
  }
}
