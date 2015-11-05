import envCommand from "./envCommand"
import * as status from "../status"

export default envCommand(function(environment, services) {
  return status.determine(environment, services).then(function(apps) {
    const actions = status.deriveActions(apps)

    actions.forEach(function(action) {
      console.log(action.description)
    })
  })
})
