import envCommand from "./envCommand"
import * as status from "../status"

export default envCommand(function(config, options, dokku, repoCache) {
  const environment = options["<environment>"]
  console.log(`deploying to ${environment} (${dokku.host})\n`)

  return status.determine(config, dokku, repoCache)
    .then(status.deriveActions)
    .then(function(actions) {
      actions.forEach(function(action) {
        console.log(action.description)
      })
    })
})
