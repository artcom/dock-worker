/* @flow */

import _ from "lodash"
import sequest from "sequest"

let pool = {}

export default {
  get(host: string): any {
    if (!pool[host]) {
      const connection = sequest.connect(host)

      const wrapper = function(command) {
        return new Promise(function(resolve, reject) {
          connection(command, function(error, stdout, options) {
            if (error) {
              reject(options ? new Error(options.stderr) : error)
            } else {
              resolve(stdout)
            }
          })
        })
      }

      pool[host] = {
        connection,
        wrapper
      }
    }

    return pool[host].wrapper
  },

  clear() {
    _.forEach(pool, ({ connection }) => connection.end())
    pool = {}
  }
}
