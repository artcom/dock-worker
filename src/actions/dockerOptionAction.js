/* @flow */

import colors from "colors/safe"

import DokkuAction from "./dokkuAction"

import type {Change} from "./dokkuAction"
import type {Status} from "../status"

export default class extends DokkuAction {
  constructor(app: Status) {
    super(app.name, app.dockerOptions, colors.magenta)
  }

  describeChange(change: Change): string {
    switch (change.type) {
      case "add":
      case "update":
        return `Set "${change.key}" for phases ${change.value.join(",")}`
      case "remove":
        return `Remove "${change.key}" for phases ${change.oldValue.join(",")}`
      default:
        return ""
    }
  }

  applyChange(change: Change): Promise {
    switch (change.type) {
      case "add":
      case "update":
        return this.dokku.addDockerOption(this.app, change.key, change.value)
      case "remove":
        return this.dokku.removeDockerOption(this.app, change.key, change.oldValue)
      default:
        return Promise.resolve()
    }
  }
}
