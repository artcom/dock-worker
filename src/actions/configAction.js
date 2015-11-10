/* @flow */

import colors from "colors/safe"

import DokkuAction from "./dokkuAction"

import type {Change} from "./dokkuAction"
import type {Status} from "../status"

export default class extends DokkuAction {
  constructor(app: Status) {
    super(app.name, app.config, colors.blue)
  }

  describeChange(change: Change): string {
    switch (change.type) {
      case "add":
        return `Set ${change.key} to "${change.value}"`
      case "update":
        return `Set ${change.key} to "${change.value}" (was "${change.oldValue}")`
      case "remove":
        return `Unset ${change.key} (was "${change.oldValue}")`
      default:
        return ""
    }
  }

  applyChange(change: Change): Promise {
    switch (change.type) {
      case "add":
      case "update":
        return this.dokku.setConfig(this.app, change.key, change.value)
      case "remove":
        return this.dokku.unsetConfig(this.app, change.key)
      default:
        return Promise.resolve()
    }
  }
}
