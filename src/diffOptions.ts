import difference from "lodash/difference"
import flatten from "lodash/flatten"
import intersection from "lodash/intersection"
import isEqual from "lodash/isEqual"

import { Options } from "./types"
import { Dictionary } from "lodash";

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

export default function diffOptions(expected: Options, deployed: Dictionary<{}>): Array<Change> {
  const { existing, missing, additional } = diffKeys(Object.keys(deployed), Object.keys(expected))

  const updates = existing
    .filter(key => !isEqual(deployed[key], expected[key]))
    .map(key => ({
      type: "update",
      key,
      oldValue: deployed[key],
      value: expected[key]
    }))

  const adds = missing.map(key => ({
    type: "add",
    key,
    value: expected[key]
  }))

  const removes = additional.map(key => ({
    type: "remove",
    key,
    oldValue: deployed[key]
  }))

  return flatten([
    updates,
    adds,
    removes
  ])
}

function diffKeys(deployed: Array<string>, expected: Array<string>) {
  return {
    existing: intersection(deployed, expected),
    missing: difference(expected, deployed),
    additional: difference(deployed, expected)
  }
}
