/* @flow */

import colors from "colors/safe"

import DokkuAction from "./dokkuAction"

import type {DeployedAppData, MissingAppData} from "../appData"
import type {Change} from "./dokkuAction"

export default class extends DokkuAction {
  constructor(app: DeployedAppData | MissingAppData) {
    const expected = app.config.dockerOptions || {}
    const deployed = app.status === "deployed" ? app.deployed.dockerOptions : {}
    super(app.name, expected, deployed, colors.blue)
  }

  describeChange(change: Change): string {
    switch (change.type) {
      case "add":
      case "update":
        return `set "${change.key}" for phases ${change.value.join(",")}`
      case "remove":
        return `remove "${change.key}" for phases ${change.oldValue.join(",")}`
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
