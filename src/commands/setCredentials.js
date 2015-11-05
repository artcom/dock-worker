import bluebird from "bluebird"
import read from "read"

import CredentialStore from "../credentialStore"

const readAsync = bluebird.promisify(read)

export default function(config, options) {
  const host = options["<host>"]
  return readAsync({ prompt: "username:" }).then(function(username) {
    return readAsync({ prompt: "password:", silent: true }).then(function(password) {
      const credentialStore = new CredentialStore()
      credentialStore.setCredentials(host, username, password)
    })
  })
}
