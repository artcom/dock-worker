const bluebird = require("bluebird")
const cp = bluebird.promisifyAll(require("child_process"))

module.exports = function(config, options) {
  const environment = options["<environment>"]
  const host = config.environments[environment]

  return cp.execFileAsync("ssh", [`dokku@${host}`, "apps"]).then(function(stdout) {
    console.log(stdout)
  })
}
