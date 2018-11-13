import Chai, { expect } from "chai"

import { deriveActions } from "../src/actions"
import { isConfigAction } from "../src/actions/configAction"
import { isCreateAction } from "../src/actions/createAction"
import { isDockerOptionAction } from "../src/actions/dockerOptionAction"
import { isPushAction } from "../src/actions/pushAction"
import { isStartAction } from "../src/actions/startAction"

declare global {
  export namespace Chai {
    interface Assertion {
      matchActionTypes(actions: Array<any>)
    }
  }
}

Chai.use(function({ Assertion }) {
  Assertion.addMethod("matchActionTypes", function(types) {
    // eslint-disable-next-line no-underscore-dangle
    const actions = this._obj
    new Assertion(actions).have.length(types.length, "wrong number of actions")
    actions.forEach((action, i) => new Assertion(types[i](action)).is.true)
  })
})

const OLD_VERSION = "ef258538b0aa09870cd39fd4f6ae39dcb82cd3ac"
const CURRENT_VERSION = "3c0d3cd3e131e4c56df95157d60868f38a9ce429"

describe("deriveActions", function() {
  describe("missing app", function() {
    it("should create and deploy a missing app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "missing",
        deployed: false,
        running: false,
        description: appDescription("app1", CURRENT_VERSION),
        actual: actualConfig("")
      })

      expect(actions).to.matchActionTypes([
        isCreateAction,
        isPushAction
      ])
    })

    it("should create, configure and deploy a missing app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "missing",
        deployed: false,
        running: false,
        description: appDescription("app1", CURRENT_VERSION, {
          FOO: "bar"
        }, {
          "--some=option": ["build", "deploy"]
        }),
        actual: actualConfig("")
      })

      expect(actions).to.matchActionTypes([
        isCreateAction,
        isConfigAction,
        isDockerOptionAction,
        isPushAction
      ])
    })
  })

  describe("created app", function() {
    it("should deploy a created app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "exists",
        deployed: false,
        running: false,
        description: appDescription("app1", CURRENT_VERSION),
        actual: actualConfig("")
      })

      expect(actions).to.matchActionTypes([
        isPushAction
      ])
    })

    it("should configure and deploy a created app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "exists",
        deployed: false,
        running: false,
        description: appDescription("app1", CURRENT_VERSION, {
          FOO: "bar"
        }, {
          "--some=option": ["build", "deploy"]
        }),
        actual: actualConfig("")
      })

      expect(actions).to.matchActionTypes([
        isConfigAction,
        isDockerOptionAction,
        isPushAction
      ])
    })

    it("should deploy a created app that is already configured", function() {
      const actions = deriveActions({
        name: "app1",
        status: "exists",
        deployed: false,
        running: false,
        description: appDescription("app1", CURRENT_VERSION, {
          FOO: "bar"
        }, {
          "--some=option": ["build", "deploy"]
        }),
        actual: actualConfig("", {
          FOO: "bar"
        }, {
          "--some=option": ["build", "deploy"]
        })
      })

      expect(actions).to.matchActionTypes([
        isPushAction
      ])
    })
  })

  describe("deployed app", function() {
    context("that is up-to-date", function() {
      it("should ignore a running app", function() {
        const actions = deriveActions({
          name: "app1",
          status: "exists",
          deployed: true,
          running: true,
          description: appDescription("app1", CURRENT_VERSION),
          actual: actualConfig(CURRENT_VERSION)
        })

        expect(actions).to.be.empty
      })

      it("should start a stopped app", function() {
        const actions = deriveActions({
          name: "app1",
          status: "exists",
          deployed: true,
          running: false,
          description: appDescription("app1", CURRENT_VERSION),
          actual: actualConfig(CURRENT_VERSION)
        })

        expect(actions).to.matchActionTypes([
          isStartAction
        ])
      })

      it("should configure a running app", function() {
        const actions = deriveActions({
          name: "app1",
          status: "exists",
          deployed: true,
          running: true,
          description: appDescription("app1", CURRENT_VERSION, {
            NEW_CONFIG: "value"
          }),
          actual: actualConfig(CURRENT_VERSION)
        })

        expect(actions).to.matchActionTypes([
          isConfigAction
        ])
      })

      it("should configure a stopped app", function() {
        const actions = deriveActions({
          name: "app1",
          status: "exists",
          deployed: true,
          running: false,
          description: appDescription("app1", CURRENT_VERSION, {}, {
            "--some=option": ["build", "deploy"]
          }),
          actual: actualConfig(CURRENT_VERSION)
        })

        expect(actions).to.matchActionTypes([
          isDockerOptionAction
        ])
      })
    })

    context("that is out-of-date", function() {
      it("should deploy a running app", function() {
        const actions = deriveActions({
          name: "app1",
          status: "exists",
          deployed: true,
          running: true,
          description: appDescription("app1", CURRENT_VERSION),
          actual: actualConfig(OLD_VERSION)
        })

        expect(actions).to.matchActionTypes([
          isPushAction
        ])
      })

      it("should deploy a stopped app", function() {
        const actions = deriveActions({
          name: "app1",
          status: "exists",
          deployed: true,
          running: false,
          description: appDescription("app1", CURRENT_VERSION),
          actual: actualConfig(OLD_VERSION)
        })

        expect(actions).to.matchActionTypes([
          isPushAction
        ])
      })

      it("should configure and deploy a running app", function() {
        const actions = deriveActions({
          name: "app1",
          status: "exists",
          deployed: true,
          running: true,
          description: appDescription("app1", CURRENT_VERSION, {
            FOO: "bar"
          }, {
            "--some=option": ["build", "deploy"]
          }),
          actual: actualConfig(OLD_VERSION, {
            OLD_COFIG: "old value"
          }, {
            "--some=option": ["deploy"]
          })
        })

        expect(actions).to.matchActionTypes([
          isConfigAction,
          isDockerOptionAction,
          isPushAction
        ])
      })

      it("should configure and deploy a stopped app", function() {
        const actions = deriveActions({
          name: "app1",
          status: "exists",
          deployed: true,
          running: false,
          description: appDescription("app1", CURRENT_VERSION, {
            FOO: "bar"
          }, {
            "--some=option": ["build", "deploy"]
          }),
          actual: actualConfig(OLD_VERSION, {
            OLD_COFIG: "old value"
          }, {
            "--some=option": ["deploy"]
          })
        })

        expect(actions).to.matchActionTypes([
          isConfigAction,
          isDockerOptionAction,
          isPushAction
        ])
      })
    })
  })

  describe("unknown app", function() {
    it("should ignore created unknown app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "unknown",
        deployed: false,
        running: false,
        actual: actualConfig("")
      })

      expect(actions).to.be.empty
    })

    it("should ignore running unknown app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "unknown",
        deployed: true,
        running: true,
        actual: actualConfig(CURRENT_VERSION)
      })

      expect(actions).to.be.empty
    })

    it("should ignore stopped unknown app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "unknown",
        deployed: true,
        running: false,
        actual: actualConfig(CURRENT_VERSION)
      })

      expect(actions).to.be.empty
    })
  })
})

function appDescription(appName, version, config = {}, dockerOptions = {}) {
  return {
    name: appName,
    repo: `git@github.com:artcom/${appName}.git`,
    version,
    config,
    environments: [],
    dockerOptions,
    stopBeforeDeployment: false
  }
}

function actualConfig(version, config = {}, dockerOptions = {}) {
  return {
    version,
    config,
    dockerOptions
  }
}
