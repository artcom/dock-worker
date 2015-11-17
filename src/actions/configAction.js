/* @flow */

import DokkuAction from "./dokkuAction"

import type {DeployedAppData, MissingAppData} from "../appData"
import type {Change} from "./dokkuAction"

export default class extends DokkuAction {
  constructor(app: DeployedAppData | MissingAppData) {
    const expected = app.config.config
    const deployed = app.status === "deployed" ? app.deployed.config : {}
    super(app.config, expected, deployed)
  }

  describeChange(change: Change): string {
    switch (change.type) {
      case "add":
        return `set ${change.key} to "${change.value}"`
      case "update":
        return `set ${change.key} to "${change.value}" (was "${change.oldValue}")`
      case "remove":
        return `unset ${change.key} (was "${change.oldValue}")`
      default:
        return ""
    }
  }

  applyChange(change: Change): Promise {
    switch (change.type) {
      case "add":
      case "update":
        return this.dokku.setConfig(this.config.name, change.key, change.value)
      case "remove":
        return this.dokku.unsetConfig(this.config.name, change.key)
      default:
        return Promise.resolve()
    }
  }
}
