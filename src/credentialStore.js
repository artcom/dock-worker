import colors from "colors/safe"
import keytar from "keytar"
import lowdb from "lowdb"

export default class {
  constructor(file = ".cache/credentials.json") {
    const db = lowdb(file)
    this.credentials = db("credentials")
  }

  listCredentials() {
    return this.credentials.pluck("host")
  }

  getCredentials(host) {
    const account = this.getAccount(host)

    if (account) {
      const password = keytar.getPassword(host, account)

      if (password) {
        return { account, password }
      }
    }

    const command = `whale set-credentials ${host}`
    throw new Error(`Missing credentials, please run ${colors.bold(command)}`)
  }

  setCredentials(host, account, password) {
    const oldAccount = this.getAccount(host)

    if (oldAccount) {
      keytar.deletePassword(host, oldAccount)
      keytar.addPassword(host, account, password)

      this.credentials
        .chain()
        .find({ host })
        .assign({ account })
        .value()
    } else {
      keytar.addPassword(host, account, password)
      this.credentials.push({ host, account })
    }

  }

  deleteCredentials(host) {
    const account = this.getAccount(host)

    if (account) {
      this.credentials.remove({ host })
      keytar.deletePassword(host, account)
    }
  }

  // PRIVATE

  getAccount(host) {
    return this.credentials
      .chain()
      .find({ host })
      .get("account")
      .value()
  }
}
