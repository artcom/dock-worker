/* @flow */

import Dokku from "../dokku"

import type { AppData } from "../appData"

export default class {
  name: string;

  constructor({ name }: AppData) {
    this.name = name
  }

  describe(): Array<string> {
    return [`start ${this.name}`]
  }

  run(dokku: Dokku): Promise<> {
    return dokku.start(this.name)
  }
}
