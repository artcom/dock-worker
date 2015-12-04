/* eslint-env mocha */

import sinon from "sinon"

import ConfigAction from "../src/actions/configAction"
import CreateAction from "../src/actions/createAction"
import DockerOptionAction from "../src/actions/dockerOptionAction"
import Dokku from "../src/dokku"

describe("Actions", function() {
  beforeEach(function() {
    this.environment = {
      name: "test",
      host: "localhost",
      protocol: "ssh",
      username: "dokku"
    }

    this.dokku = new Dokku(this.environment)
    this.mock = sinon.mock(this.dokku)

    this.config = {
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

    this.deployed = {
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
        .withArgs("new-app")
        .returns(Promise.resolve())

      return action.run(this.dokku, this.environment)
    })
  })

  describe("config", function() {
    it("should set, update and unset config variables", function() {
      const appData = {
        name: "app1",
        status: "deployed",
        config: this.config,
        deployed: this.deployed
      }

      const action = new ConfigAction(appData)

      const calls = [
        this.mock.expects("setConfig")
          .withArgs("app1", { SHOULD_CHANGE: "to this" })
          .returns(Promise.resolve()),
        this.mock.expects("setConfig")
          .withArgs("app1", { SHOULD_ADD: "new value" })
          .returns(Promise.resolve()),
        this.mock.expects("unsetConfig")
          .withArgs("app1", "SHOULD_REMOVE")
          .returns(Promise.resolve())
      ]

      return action.run(this.dokku, this.environment).then(() => {
        sinon.assert.callOrder(...calls)
      })
    })
  })

  describe("docker options", function() {
    it("should add, update and remove docker options", function() {
      const appData = {
        name: "app1",
        status: "deployed",
        config: this.config,
        deployed: this.deployed
      }

      const action = new DockerOptionAction(appData)

      const calls = [
        this.mock.expects("addDockerOption")
          .withArgs("app1", "--should-change", ["deploy", "run"])
          .returns(Promise.resolve()),
        this.mock.expects("addDockerOption")
          .withArgs("app1", "--should-add", ["deploy", "run"])
          .returns(Promise.resolve()),
        this.mock.expects("removeDockerOption")
          .withArgs("app1", "--should-remove", ["build", "deploy", "run"])
          .returns(Promise.resolve())
      ]

      return action.run(this.dokku, this.environment).then(() => {
        sinon.assert.callOrder(...calls)
      })
    })
  })
})
