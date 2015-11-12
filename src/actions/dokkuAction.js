/* @flow */

import _ from "lodash"
import bluebird from "bluebird"

import Dokku from "../dokku"

import type {Environment, Options, ServiceConfig} from "../types"

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
  config: ServiceConfig;
  applyChange: (change: Change) => Promise;
  changes: Array<Change>;
  describeChange: (change: Change) => string;
  dokku: Dokku;
  /* jscs:enable disallowSemicolons */

  constructor(config: ServiceConfig, expected: Options, deployed: Options) {
    this.config = config
    this.changes = diffOptions(expected, deployed)
  }

  describe(): Array<string> {
    return this.changes.map(this.describeChange.bind(this))
  }

  run(environment: Environment): Promise {
    this.dokku = new Dokku(environment.host)

    return bluebird.each(this.changes, (change) => {
      const stopService = this.config.stopBeforeDeployment
        ? this.dokku.stop(this.config.name)
        : Promise.resolve()

      return stopService
        .then(() => this.applyChange(change))
    })
  }
}

function diffOptions(expected: Options, deployed: Options): Array<Change> {
  const {existing, missing, additional} = diffKeys(Object.keys(deployed), Object.keys(expected))

  return _(existing)
    .reject((key) => _.isEqual(deployed[key], expected[key]))
    .map((key) => ({
      type: "update",
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
