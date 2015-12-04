/* @flow */

import _ from "lodash"
import bluebird from "bluebird"

import Dokku from "../dokku"

import type {Options, AppConfig} from "../types"

export type Change = Add | Remove | Update

type Add = {
  type: "add",
  key: string,
  value: any
}

type Remove = {
  type: "remove",
  key: string,
  oldValue: any
}

type Update = {
  type: "update",
  key: string,
  oldValue: any,
  value: any
}

export default class {
  /* jscs:disable disallowSemicolons */
  config: AppConfig;
  applyChange: (change: Change) => Promise;
  changes: Array<Change>;
  describeChange: (change: Change) => string;
  dokku: Dokku;
  /* jscs:enable disallowSemicolons */

  constructor(config: AppConfig, expected: Options, deployed: Options) {
    this.config = config
    this.changes = diffOptions(expected, deployed)
  }

  describe(): Array<string> {
    return this.changes.map(this.describeChange.bind(this))
  }

  run(dokku: Dokku): Promise {
    this.dokku = dokku

    return bluebird.each(this.changes, (change) => {
      const stopApp = this.config.stopBeforeDeployment
        ? this.dokku.stop(this.config.name)
        : Promise.resolve()

      return stopApp.then(this.applyChange.bind(this, change))
    })
  }
}

function diffOptions(expected: Options, deployed: Options): Array<Change> {
  const {existing, missing, additional} = diffKeys(Object.keys(deployed), Object.keys(expected))

  const updates = _.chain(existing)
    .reject((key) => _.isEqual(deployed[key], expected[key]))
    .map((key) => ({
      type: "update",
      key,
      oldValue: deployed[key],
      value: expected[key]
    }))
    .value()

  const adds = missing.map((key) => ({
    type: "add",
    key,
    value: expected[key]
  }))

  const removes = additional.map((key) => ({
    type: "remove",
    key,
    oldValue: deployed[key]
  }))

  return _.flatten([
    updates,
    adds,
    removes
  ])
}

function diffKeys(deployed: Array<string>, expected: Array<string>) {
  return {
    existing: _.intersection(deployed, expected),
    missing: _.difference(expected, deployed),
    additional: _.difference(deployed, expected)
  }
}
