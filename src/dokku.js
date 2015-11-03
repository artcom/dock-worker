import _ from "lodash"
import bluebird from "bluebird"
import cp from "child_process"
const cpAsync = bluebird.promisifyAll(cp)

export default class {
  constructor(host) {
    this.host = host
  }

  apps() {
    return cpAsync.execFileAsync("ssh", [this.host, "apps"]).then((stdout) =>
      _(stdout)
        .split("\n")
        .reject((line) => line === "" || line.startsWith("=====>"))
        .value()
    )
  }
}
