import _ from "lodash"
import util from "util"

import envCommand from "./envCommand"
import * as status from "../status"

export default envCommand(function(environment, services) {
  return status.determine(environment, services).then(function(apps) {
    _(apps)
      .map(status.computeDiffs)
      .flatten()
      .forEach(function(diff) {
        console.log(util.inspect(diff))
      })
      .value()
  })
})
