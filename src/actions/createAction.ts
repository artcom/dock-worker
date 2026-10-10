import Dokku from "../dokku.js"

import { AppData } from "../appData.js"

export function needsCreateAction(app: AppData): boolean {
  return app.status === "missing"
}

export function makeCreateAction(app): CreateAction {
  return new CreateAction(app)
}

export function isCreateAction(action: any): boolean {
  return action instanceof CreateAction
}

class CreateAction {
  name: string

  constructor({ name }: { name: string }) {
    this.name = name
  }

  describe(): Array<string> {
    return [`create ${this.name}`]
  }

  run(dokku: Dokku): Promise<Array<string>> {
    return dokku.create(this.name)
  }
}
