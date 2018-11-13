import Dokku from "../dokku"

import { AppData } from "../appData"

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
  name: string;

  constructor({ name }: {name: string}) {
    this.name = name
  }

  describe(): Array<string> {
    return [`create ${this.name}`]
  }

  run(dokku: Dokku): Promise<Array<String>> {
    return dokku.create(this.name)
  }
}
