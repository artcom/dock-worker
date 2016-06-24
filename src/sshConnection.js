/* @flow */

import { Client } from "ssh2"
import BufferList from "bl"

export default class SshConnection {
  /* jscs:disable disallowSemicolons */
  client: Client;
  connect: Promise;
  /* jscs:enable disallowSemicolons */

  constructor(username: string, host: string) {
    this.client = new Client()

    this.connect = new Promise((resolve, reject) => {
      this.client.on("ready", () => {
        resolve()
      }).on("error", (error) => {
        reject(error)
      }).connect({
        host,
        username,
        agent: process.env.SSH_AUTH_SOCK,
        readyTimeout: 30000
      })
    })
  }

  exec(command: string): Promise<string> {
    return this.connect.then(() => {
      return new Promise((resolve, reject) => {
        this.client.exec(command, (error, stream) => {
          if (error) {
            reject(error)
          }

          const stdout = new BufferList()
          const stderr = new BufferList()

          stream.pipe(stdout)
          stream.stderr.pipe(stderr)

          stream.on("close", (code) => {
            if (code === 0) {
              resolve(stdout.toString())
            } else {
              reject(new Error(stderr.toString()))
            }
          })
        })
      })
    })
  }

  close() {
    this.client.end()
  }
}
