/* @flow */

import bluebird from "bluebird"
import sequest from "sequest"

const pool = new Map()

export default {
  get(host: string): any {
    if (!pool.has(host)) {
      const connection = bluebird.promisify(sequest.connect(host))
      pool.set(host, connection)
    }

    return pool.get(host)
  },

  clear() {
    pool.forEach(function(connection) {
      connection.end()
    })

    pool.clear()
  }
}
