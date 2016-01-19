/* @flow */

import bluebird from "bluebird"

import diffOptions from "../diffOptions"
import Dokku from "../dokku"

import type { DeployedAppData, MissingAppData } from "../appData"
import type { Change } from "../diffOptions"
import type { AppConfig } from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  changes: Array<Change>;
  config: AppConfig;
  /* jscs:enable disallowSemicolons */

  constructor(app: DeployedAppData | MissingAppData) {
    const expected = app.config.dockerOptions
    const deployed = app.status === "deployed" ? app.deployed.dockerOptions : {}
    this.changes = diffOptions(expected, deployed)
    this.config = app.config
  }

  describe(): Array<string> {
    return this.changes.map(describeChange)
  }

  run(dokku: Dokku): Promise {
    const app = this.config.name

    return bluebird.each(this.changes, (change) => applyChange(dokku, app, change))
      .then(() => {
        if (this.config.stopBeforeDeployment) {
          return dokku.stop(app).then(() => dokku.start(app))
        } else {
          return dokku.restart(app)
        }
      })
  }
}

function describeChange(change: Change): string {
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

function applyChange(dokku: Dokku, app: string, change: Change): Promise {
  switch (change.type) {
    case "add": {
      const { key, value } = change
      return dokku.addDockerOption(app, key, value)
    }

    case "update": {
      const { key, value, oldValue } = change
      return dokku.removeDockerOption(app, key, oldValue)
        .then(() => dokku.addDockerOption(app, key, value))
    }

    case "remove": {
      const { key, oldValue } = change
      return dokku.removeDockerOption(app, key, oldValue)
    }

    default:
      return Promise.resolve()
  }
}
