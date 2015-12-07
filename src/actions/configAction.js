/* @flow */

import _ from "lodash"

import diffOptions from "../diffOptions"
import Dokku from "../dokku"

import type {DeployedAppData, MissingAppData} from "../appData"
import type {Change} from "../diffOptions"
import type {AppConfig} from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  changes: Array<Change>;
  config: AppConfig;
  /* jscs:enable disallowSemicolons */

  constructor(app: DeployedAppData | MissingAppData) {
    const expected = app.config.config
    const deployed = app.status === "deployed" ? app.deployed.config : {}
    this.changes = diffOptions(expected, deployed)
    this.config = app.config
  }

  describe(): Array<string> {
    return this.changes.map(describeChange)
  }

  run(dokku: Dokku): Promise {
    const [unset, set] = _.partition(this.changes, (change) => change.type === "remove")

    return setConfig(dokku, this.config, set)
      .then(() => unsetConfig(dokku, this.config, unset))
  }
}

function describeChange(change: Change): string {
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

type ChangeFunction = (dokku: Dokku, config: AppConfig, changes: Array<Change>) => Promise

function changeConfig(func: ChangeFunction): ChangeFunction {
  return function(dokku, config, changes) {
    if (_.isEmpty(changes)) {
      return Promise.resolve()
    } else {
      const stopApp = config.stopBeforeDeployment
        ? dokku.stop(config.name)
        : Promise.resolve()

      return stopApp.then(() => func(dokku, config, changes))
    }
  }
}

const setConfig = changeConfig(function(dokku, config, changes) {
  const options = _.chain(changes)
    .map(({key, value}) => [key, value])
    .zipObject()
    .value()

  return dokku.setConfig(config.name, options)
})

const unsetConfig = changeConfig(function(dokku, config, changes) {
  const vars = _.pluck(changes, "key")
  return dokku.unsetConfig(config.name, ...vars)
})
