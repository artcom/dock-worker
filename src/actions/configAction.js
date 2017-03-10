/* @flow */

import fromPairs from "lodash/fromPairs"
import map from "lodash/map"
import partition from "lodash/partition"

import diffOptions from "../diffOptions"
import Dokku from "../dokku"

import type { KnownAppData } from "../appData"
import type { Change } from "../diffOptions"
import type { AppDescription } from "../types"

export default class {
  changes: Array<Change>;
  description: AppDescription;

  constructor(app: KnownAppData) {
    this.changes = diffOptions(app.description.config, app.actual.config)
    this.description = app.description
  }

  describe(): Array<string> {
    return this.changes.map(describeChange)
  }

  async run(dokku: Dokku): Promise<> {
    const [unset, set] = partition(this.changes, change => change.type === "remove")

    await setConfig(dokku, this.description, set)
    await unsetConfig(dokku, this.description, unset)
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

async function stopApp(dokku, description) {
  if (description.stopBeforeDeployment) {
    await dokku.stop(description.name)
  }
}

async function setConfig(dokku, description, changes) {
  if (changes.length === 0) {
    return
  }

  const options = fromPairs(changes.map(({ key, value }) => [key, value]))

  await stopApp(dokku, description)
  await dokku.setConfig(description.name, options)
}

async function unsetConfig(dokku, description, changes) {
  if (changes.length === 0) {
    return
  }

  const vars = map(changes, "key")

  await stopApp(dokku, description)
  await dokku.unsetConfig(description.name, ...vars)
}
