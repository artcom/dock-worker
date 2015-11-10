/* @flow */

import _ from "lodash"

import Dokku from "../dokku"

import type {Options, Environment} from "../types"

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
  app: string;
  applyChange: (change: Change) => Promise;
  changes: Array<Change>;
  color: any;
  describeChange: (change: Change) => string;
  dokku: Dokku;
  /* jscs:enable disallowSemicolons */

  constructor(app: string, expected: Options, deployed: Options, color: any) {
    this.app = app
    this.changes = diffOptions(expected, deployed)
    this.color = color
  }

  describe(): Array<string> {
    return this.changes.map((change) => this.color(this.describeChange(change)))
  }

  run(environment: Environment): Promise {
    // this.dokku = new Dokku(environment.host)
    // return Promise.all(this.changes.map(this.applyChange.bind(this)))

    return Promise.resolve()
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
