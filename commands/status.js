const _ = require("lodash")
const bluebird = require("bluebird")
const colors = require("colors/safe")
const cp = bluebird.promisifyAll(require("child_process"))
const table = require("text-table")

module.exports = function(config, options) {
  const environment = options["<environment>"]
  const host = config.environments[environment]

  console.log(`status of ${environment} (${host})\n`)

  return cp.execFileAsync("ssh", [`dokku@${host}`, "apps"]).then(function(stdout) {
    const defined = _.map(config.services, "name")
    const available = _(stdout)
      .split("\n")
      .reject((line) => line === "" || line.startsWith("=====>"))
      .value()

    const deployed = _.intersection(defined, available)
    const additional = _.difference(available, defined)
    const missing = _.difference(defined, available)

    function status(app) {
      if (_.includes(deployed, app)) return colors.green("deployed")
      if (_.includes(additional, app)) return colors.gray("additional")
      if (_.includes(missing, app)) return colors.red("missing")
    }

    const rows = _(defined)
      .union(available)
      .sort()
      .map((app) => [app, status(app)])
      .value()

    console.log(table(rows))
  })
}
