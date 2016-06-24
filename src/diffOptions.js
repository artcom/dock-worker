/* @flow */

import _ from "lodash"

import type { Options } from "./types"

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

export default function diffOptions(expected: Options, deployed: Options): Array<Change> {
  const { existing, missing, additional } = diffKeys(Object.keys(deployed), Object.keys(expected))

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
