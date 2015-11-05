import colors from "colors/safe"
import nodegit from "nodegit"
import path from "path"
import readline from "readline"
import url from "url"

import CredentialStore from "./credentialStore"

const fetchOpts = {
  callbacks: {
    credentials: (repoUrl, username, allowedTypes) => {
      if (allowedTypes & nodegit.Cred.TYPE.SSH_KEY) {
        return nodegit.Cred.sshKeyFromAgent(username)
      } else if (allowedTypes & nodegit.Cred.TYPE.USERPASS_PLAINTEXT) {
        const host = url.parse(repoUrl).hostname
        const credentialStore = new CredentialStore()

        if (credentialStore.hasCredentials(host)) {
          const { account, password } = credentialStore.getCredentials(host)
          return nodegit.Cred.userpassPlaintextNew(account, password)
        } else {
          const command = `whale set-credentials ${host}`
          throw new Error(`Missing credentials, please run ${colors.bold(command)}`)
        }
      } else {
        throw new Error("Unexpected credential type requested")
      }
    }
  }
}

export default class {
  constructor(cacheDir = ".cache") {
    this.cacheDir = cacheDir
  }

  getRepo(service, environment) {
    const localPath = path.resolve(this.cacheDir, service.name)

    return nodegit.Repository.openBare(localPath).then(
      (repo) => this.fetchRepo(service, repo),
      () => this.cloneRepo(service, localPath)
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
      ).then(() =>
        repo.fetch(environment.name, fetchOpts)
      ).then(() =>
        repo
      )
    })
  }

  // PRIVATE

  cloneRepo(service, localPath) {
    readline.clearLine(process.stdout, 0)
    process.stdout.write(colors.gray(`cloning ${colors.bold(service.name)}\r`))

    return nodegit.Clone.clone(service.repo, localPath, { bare: 1, fetchOpts })
  }

  fetchRepo(service, repo) {
    readline.clearLine(process.stdout, 0)
    process.stdout.write(colors.gray(`fetching ${colors.bold(service.name)}\r`))

    return repo.fetch("origin", fetchOpts)
      .then(() => repo)
  }
}
