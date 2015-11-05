import nodegit from "nodegit"
import path from "path"
import url from "url"

import CredentialStore from "./credentialStore"

const dokkuFetchOpts = {
  callbacks: {
    credentials: (repoUrl, user) => {
      return nodegit.Cred.sshKeyFromAgent(user)
    }
  }
}

export default class {
  constructor(cacheDir = ".cache") {
    this.cacheDir = cacheDir
  }

  getRepo(service, environment) {
    const localPath = path.resolve(this.cacheDir, service.name)

    const host = url.parse(service.repo).hostname
    const credentialStore = new CredentialStore()
    const { account, password } = credentialStore.getCredentials(host)

    const sourceFetchOpts = {
      callbacks: {
        credentials: () => {
          return nodegit.Cred.userpassPlaintextNew(account, password)
        }
      }
    }

    return nodegit.Repository.openBare(localPath).then(
      (repo) => repo.fetch("origin", sourceFetchOpts).then(() => repo),
      () => nodegit.Clone.clone(service.repo, localPath, { bare: 1, fetchOpts: sourceFetchOpts })
    ).then((repo) => {
      const remoteUrl = url.format({
        slashes: true,
        protocol: environment.protocol,
        auth: environment.username,
        host: environment.host,
        pathname: "/" + service.name
      })

      return nodegit.Remote.lookup(repo, environment.name).then(
        () => nodegit.Remote.setUrl(repo, environment.name, remoteUrl),
        () => nodegit.Remote.create(repo, environment.name, remoteUrl)
      ).then(() => repo)
    }).then((repo) =>
      repo.fetch(environment.name, dokkuFetchOpts).then(() => repo)
    )
  }
}
