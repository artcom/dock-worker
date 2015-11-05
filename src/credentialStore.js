import keytar from "keytar"
import lowdb from "lowdb"

export default class {
  constructor(file = ".cache/credentials.json") {
    const db = lowdb(file)
    this.credentials = db("credentials")
  }

  hasCredentials(host) {
    return this.credentials.some({ host })
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

    throw new Error(`No credentials for ${host}`)
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
