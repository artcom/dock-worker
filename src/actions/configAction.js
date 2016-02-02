/* @flow */

import _ from "lodash"

import diffOptions from "../diffOptions"
import Dokku from "../dokku"

import type { KnownAppData } from "../appData"
import type { Change } from "../diffOptions"
import type { AppDescription } from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  changes: Array<Change>;
  description: AppDescription;
  /* jscs:enable disallowSemicolons */

  constructor(app: KnownAppData) {
    this.changes = diffOptions(app.description.config, app.actual.config)
    this.description = app.description
  }

  describe(): Array<string> {
    return this.changes.map(describeChange)
  }

  run(dokku: Dokku): Promise {
    const [unset, set] = _.partition(this.changes, (change) => change.type === "remove")

    return setConfig(dokku, this.description, set)
      .then(() => unsetConfig(dokku, this.description, unset))
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

function stopApp(dokku, description) {
  return description.stopBeforeDeployment ? dokku.stop(description.name) : Promise.resolve()
}

const setConfig = function(dokku, description, changes) {
  if (_.isEmpty(changes)) {
    return Promise.resolve()
  }

  const options = _.chain(changes)
    .map(({ key, value }) => [key, value])
    .fromPairs()
    .value()

  return stopApp(dokku, description).then(() => dokku.setConfig(description.name, options))
}

const unsetConfig = function(dokku, description, changes) {
  if (_.isEmpty(changes)) {
    return Promise.resolve()
  }

  const vars = _.map(changes, "key")
  return stopApp(dokku, description).then(() => dokku.unsetConfig(description.name, ...vars))
}
