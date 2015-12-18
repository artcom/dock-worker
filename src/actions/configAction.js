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

function stopApp(dokku, config) {
  return config.stopBeforeDeployment ? dokku.stop(config.name) : Promise.resolve()
}

const setConfig = function(dokku, config, changes) {
  if (_.isEmpty(changes)) {
    return Promise.resolve()
  }

  const options = _.chain(changes)
    .map(({key, value}) => [key, value])
    .zipObject()
    .value()

  return stopApp(dokku, config).then(() => dokku.setConfig(config.name, options))
}

const unsetConfig = function(dokku, config, changes) {
  if (_.isEmpty(changes)) {
    return Promise.resolve()
  }

  const vars = _.pluck(changes, "key")
  return stopApp(dokku, config).then(() => dokku.unsetConfig(config.name, ...vars))
}
