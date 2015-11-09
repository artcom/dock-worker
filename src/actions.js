import _ from "lodash"

import type {Status} from "./status"
import type {Config} from "./types"

export type Action = {
  description: string,
  changes?: Array<Change>
}

export type Change = {
  type: string,
  key: string,
  oldValue?: any,
  value?: any
}

export function derive(app: Status): Array<Action> {
  const actions = []

  if (app.type === "missing") {
    actions.push({
      description: `Deploy ${app.name}`
    })
  } else if (app.type === "deployed") {
    if (app.version.expected !== app.version.deployed) {
      actions.push({
        description: `Update ${app.name}`
      })
    }

    if (app.config && !_.isEqual(app.config.expected, app.config.deployed)) {
      actions.push({
        description: `Configure ${app.name}`,
        changes: diffObjects(app.config.deployed, app.config.expected)
      })
    }

    if (app.dockerOptions && !_.isEqual(app.dockerOptions.expected, app.dockerOptions.deployed)) {
      actions.push({
        description: `Set Docker Options ${app.name}`,
        changes: diffObjects(app.dockerOptions.deployed, app.dockerOptions.expected)
      })
    }
  }

  return actions
}

function diffObjects(deployed: Config, expected: Config): Array<Change> {
  const {existing, missing, additional} = diffKeys(Object.keys(deployed), Object.keys(expected))

  return _(existing)
    .reject((key) => _.isEqual(deployed[key], expected[key]))
    .map((key) => ({
      type: "change",
      key,
      oldValue: deployed[key],
      value: expected[key]
    }))
    .concat(missing.map((key) => ({
      type: "add",
      key,
      value: expected[key]
    })))
    .concat(additional.map((key) => ({
      type: "remove",
      key,
      oldValue: deployed[key]
    })))
    .flatten()
    .value()
}

function diffKeys(deployed: Array<string>, expected: Array<string>) {
  return {
    existing: _.intersection(deployed, expected),
    missing: _.difference(expected, deployed),
    additional: _.difference(deployed, expected)
  }
}
