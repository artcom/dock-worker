/* @flow */

import Dokku from "../dokku"

import type { AppData } from "../appData"

export default class {
  name: string;

  constructor({ name }: AppData) {
    this.name = name
  }

  describe(): Array<string> {
    return [`create ${this.name}`]
  }

  run(dokku: Dokku): Promise<> {
    return dokku.create(this.name)
  }
}
