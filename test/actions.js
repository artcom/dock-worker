/* eslint-env mocha */

import sinon from "sinon"

import ConfigAction from "../src/actions/configAction"
import CreateAction from "../src/actions/createAction"
import DockerOptionAction from "../src/actions/dockerOptionAction"
import Dokku from "../src/dokku"

describe("Actions", function() {
  beforeEach(function() {
    this.dokku = new Dokku("localhost")
    this.mock = sinon.mock(this.dokku)

    this.description = {
      name: "app1",
      repo: "git@github.com:artcom/app1.git",
      version: "3c0d3cd3e131e4c56df95157d60868f38a9ce429",
      config: {
        SHOULD_CHANGE: "to this",
        SHOULD_ADD: "new value",
        SHOULD_KEEP: "existing value"
      },
      dockerOptions: {
        "--should-change": ["deploy", "run"],
        "--should-add": ["deploy", "run"]
      },
      stopBeforeDeployment: false
    }

    this.actual = {
      version: "ef258538b0aa09870cd39fd4f6ae39dcb82cd3ac",
      config: {
        SHOULD_CHANGE: "from this",
        SHOULD_REMOVE: "old value",
        SHOULD_KEEP: "existing value"
      },
      dockerOptions: {
        "--should-change": ["build"],
        "--should-remove": ["build", "deploy", "run"]
      }
    }
  })

  afterEach(function() {
    this.mock.verify()
  })

  describe("create", function() {
    it("should create an app", function() {
      const action = new CreateAction({ name: "new-app" })

      this.mock.expects("create")
        .withExactArgs("new-app")
        .returns(Promise.resolve())

      return action.run(this.dokku)
    })
  })

  describe("config", function() {
    it("should configure environment variables", async function() {
      const appData = {
        name: "app1",
        status: "deployed",
        description: this.description,
        actual: this.actual
      }

      const action = new ConfigAction(appData)

      const calls = [
        this.mock.expects("setConfig")
          .withExactArgs("app1", { SHOULD_ADD: "new value", SHOULD_CHANGE: "to this" })
          .returns(Promise.resolve()),
        this.mock.expects("unsetConfig")
          .withExactArgs("app1", "SHOULD_REMOVE")
          .returns(Promise.resolve())
      ]

      await action.run(this.dokku)
      sinon.assert.callOrder(...calls)
    })

    it("should configure environment variables for apps that must be stopped", async function() {
      const appData = {
        name: "app1",
        status: "deployed",
        description: Object.assign(this.description, { stopBeforeDeployment: true }),
        actual: this.actual
      }

      const action = new ConfigAction(appData)

      const calls = [
        this.mock.expects("stop")
          .withExactArgs("app1")
          .returns(Promise.resolve()),
        this.mock.expects("setConfig")
          .withExactArgs("app1", { SHOULD_ADD: "new value", SHOULD_CHANGE: "to this" })
          .returns(Promise.resolve()),
        this.mock.expects("stop")
          .withExactArgs("app1")
          .returns(Promise.resolve()),
        this.mock.expects("unsetConfig")
          .withExactArgs("app1", "SHOULD_REMOVE")
          .returns(Promise.resolve())
      ]

      await action.run(this.dokku)
      sinon.assert.callOrder(...calls)
    })
  })

  describe("docker options", function() {
    it("should configure docker options", async function() {
      const appData = {
        name: "app1",
        status: "deployed",
        description: this.description,
        actual: this.actual
      }

      const action = new DockerOptionAction(appData)

      const calls = [
        this.mock.expects("removeDockerOption")
          .withExactArgs("app1", "--should-change", ["build"])
          .returns(Promise.resolve()),
        this.mock.expects("addDockerOption")
          .withExactArgs("app1", "--should-change", ["deploy", "run"])
          .returns(Promise.resolve()),
        this.mock.expects("addDockerOption")
          .withExactArgs("app1", "--should-add", ["deploy", "run"])
          .returns(Promise.resolve()),
        this.mock.expects("removeDockerOption")
          .withExactArgs("app1", "--should-remove", ["build", "deploy", "run"])
          .returns(Promise.resolve()),
        this.mock.expects("restart")
          .withExactArgs("app1")
          .returns(Promise.resolve())
      ]

      await action.run(this.dokku)
      sinon.assert.callOrder(...calls)
    })

    it("should configure docker options for apps that must be stopped", async function() {
      const appData = {
        name: "app1",
        status: "deployed",
        description: Object.assign(this.description, { stopBeforeDeployment: true }),
        actual: this.actual
      }

      const action = new DockerOptionAction(appData)

      const calls = [
        this.mock.expects("removeDockerOption")
          .withExactArgs("app1", "--should-change", ["build"])
          .returns(Promise.resolve()),
        this.mock.expects("addDockerOption")
          .withExactArgs("app1", "--should-change", ["deploy", "run"])
          .returns(Promise.resolve()),
        this.mock.expects("addDockerOption")
          .withExactArgs("app1", "--should-add", ["deploy", "run"])
          .returns(Promise.resolve()),
        this.mock.expects("removeDockerOption")
          .withExactArgs("app1", "--should-remove", ["build", "deploy", "run"])
          .returns(Promise.resolve()),
        this.mock.expects("stop")
          .withExactArgs("app1")
          .returns(Promise.resolve()),
        this.mock.expects("start")
          .withExactArgs("app1")
          .returns(Promise.resolve())
      ]

      await action.run(this.dokku)
      sinon.assert.callOrder(...calls)
    })
  })
})
