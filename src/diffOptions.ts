import difference from "lodash/difference"
import flatten from "lodash/flatten"
import intersection from "lodash/intersection"
import isEqual from "lodash/isEqual"

import { Options } from "./types"

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

  const updates = existing
    .filter(key => !isEqual(deployed[key], expected[key]))
    .map((key: string): Update => ({
      type: "update",
      key,
      oldValue: deployed[key],
      value: expected[key]
    }))

  const adds: Array<Add> = missing.map((key: string): Add => ({
    type: "add",
    key,
    value: expected[key]
  }))

  const removes: Array<Remove> = additional.map((key: string): Remove => ({
    type: "remove",
    key,
    oldValue: deployed[key]
  }))

  return flatten<Change>([
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
