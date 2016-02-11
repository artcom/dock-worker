/* eslint-env mocha */

import chai, { expect } from "chai"

import { deriveActions } from "../src/actions"
import ConfigAction from "../src/actions/configAction"
import CreateAction from "../src/actions/createAction"
import DockerOptionAction from "../src/actions/dockerOptionAction"
import PushAction from "../src/actions/pushAction"
import StartAction from "../src/actions/startAction"

chai.use(function({ Assertion }) {
  Assertion.addMethod("matchActionTypes", function(types) {
    const actions = this._obj
    new Assertion(actions).have.length(types.length, "wrong number of actions")
    actions.forEach((action, i) => new Assertion(action).is.instanceof(types[i]))
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
        CreateAction,
        PushAction
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
        CreateAction,
        ConfigAction,
        DockerOptionAction,
        PushAction
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
        PushAction
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
        ConfigAction,
        DockerOptionAction,
        PushAction
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
        PushAction
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
          StartAction
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
          PushAction
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
          PushAction
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
          ConfigAction,
          DockerOptionAction,
          PushAction
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
          ConfigAction,
          DockerOptionAction,
          PushAction
        ])
      })
    })
  })

  describe("unknown app", function() {
    it("should ignore running unknown app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "unknown",
        running: true
      })

      expect(actions).to.be.empty
    })

    it("should ignore stopped unknown app", function() {
      const actions = deriveActions({
        name: "app1",
        status: "unknown",
        running: false
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
