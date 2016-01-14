/* eslint-env mocha */

import _ from "lodash"
import chai, {expect} from "chai"
import chaiAsPromised from "chai-as-promised"
import sinon from "sinon"

import Dokku from "../src/dokku"

chai.use(chaiAsPromised)

describe("Dokku", function() {
  beforeEach(function() {
    this.dokku = new Dokku({ host: "localhost", username: "dokku" })
    this.mock = sinon.mock(this.dokku)
  })

  afterEach(function() {
    this.mock.verify()
  })

  describe("Apps", function() {
    it("should list apps", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "apps")
        .returns(Promise.resolve(unindent(`
          =====> My Apps
          app1
          app2
          app3
          `
        )))

      return expect(this.dokku.apps()).to.eventually.deep.equal([
        "app1",
        "app2",
        "app3"
      ])
    })

    it("should create an app", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "apps:create", "new-app")
        .returns(Promise.resolve(""))

      return this.dokku.create("new-app")
    })
  })

  describe("Config", function() {
    it("should get the config", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "config", "app1")
        .returns(Promise.resolve(unindent(`
          =====> app1 config vars
          DOKKU_DOCKERFILE_PORT: 8000
          DOKKU_NGINX_PORT:      80
          URL:                   http://example.com/
          NUMBER:                23
          `
        )))

      return expect(this.dokku.config("app1")).to.eventually.deep.equal({
        URL: "http://example.com/",
        NUMBER: "23"
      })
    })

    it("should get an empty config", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "config", "app1")
        .returns(Promise.reject(new Error(unindent(`
          no config vars for app1
          `
        ))))

      return expect(this.dokku.config("app1")).to.eventually.deep.equal({})
    })

    it("should set a single config variable", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "config:set", "app1", `FOO="bar"`)
        .returns(Promise.resolve(""))

      return this.dokku.setConfig("app1", { FOO: "bar" })
    })

    it("should set multiple config variables", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "config:set", "app1", `FOO="bar"`, `NUMBER="42"`)
        .returns(Promise.resolve(""))

      return this.dokku.setConfig("app1", { FOO: "bar", NUMBER: 42 })
    })

    it("should unset a single config variable", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "config:unset", "app1", "FOO")
        .returns(Promise.resolve(""))

      return this.dokku.unsetConfig("app1", "FOO")
    })

    it("should unset multiple config variables", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "config:unset", "app1", "FOO", "NUMBER")
        .returns(Promise.resolve(""))

      return this.dokku.unsetConfig("app1", "FOO", "NUMBER")
    })
  })

  describe("Docker Options", function() {
    it("should get docker options for all phases", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "docker-options", "app1")
        .returns(Promise.resolve(unindent(`
          Build options:
              -v=/var/local/data:/app/data
          Deploy options:
              -p=8080:8080
              -v=/var/local/data:/app/data
          Run options:
              -v=/var/local/data:/app/data
          `
        )))

      return expect(this.dokku.dockerOptions("app1")).to.eventually.deep.equal({
        "-v=/var/local/data:/app/data": ["build", "deploy", "run"],
        "-p=8080:8080": ["deploy"]
      })
    })

    it("should get docker options for some phases", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "docker-options", "app1")
        .returns(Promise.resolve(unindent(`
          Deploy options:
              -p=8080:8080
              -v=/var/local/data:/app/data
          Run options:
              -v=/var/local/data:/app/data
          `
        )))

      return expect(this.dokku.dockerOptions("app1")).to.eventually.deep.equal({
        "-v=/var/local/data:/app/data": ["deploy", "run"],
        "-p=8080:8080": ["deploy"]
      })
    })

    it("should get empty docker options", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "docker-options", "app1")
        .returns(Promise.resolve(""))

      return expect(this.dokku.dockerOptions("app1")).to.eventually.deep.equal({})
    })

    it("should add a docker option for one phase", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "docker-options:add", "app1", "deploy", "--foo")
        .returns(Promise.resolve(""))

      return this.dokku.addDockerOption("app1", "--foo", ["deploy"])
    })

    it("should add a docker option for all phases", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "docker-options:add", "app1", "build,deploy,run", "--foo")
        .returns(Promise.resolve(""))

      return this.dokku.addDockerOption("app1", "--foo", ["build", "deploy", "run"])
    })

    it("should remove a docker option for one phase", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "docker-options:remove", "app1", "deploy", "--foo")
        .returns(Promise.resolve(""))

      return this.dokku.removeDockerOption("app1", "--foo", ["deploy"])
    })

    it("should remove a docker option for all phases", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "docker-options:remove", "app1", "build,deploy,run", "--foo")
        .returns(Promise.resolve(""))

      return this.dokku.removeDockerOption("app1", "--foo", ["build", "deploy", "run"])
    })
  })

  describe("Process", function() {
    it("should start an app", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "ps:start", "app1")
        .returns(Promise.resolve(""))

      return this.dokku.start("app1")
    })

    it("should stop an app", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "ps:stop", "app1")
        .returns(Promise.resolve(""))

      return this.dokku.stop("app1")
    })

    it("should not fail when stopping undeployed app", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "ps:stop", "app1")
        .returns(Promise.reject(new Error("App app1 has not been deployed\n")))

      return this.dokku.stop("app1")
    })

    it("should restart an app", function() {
      this.mock.expects("ssh")
        .withArgs("dokku@localhost", "ps:restart", "app1")
        .returns(Promise.resolve(""))

      return this.dokku.restart("app1")
    })
  })
})

function unindent(string) {
  const lines = _.chain(string)
    .split("\n")
    .drop(1)
    .value()

  const [indentation] = lines[0].match(/\s*/)

  return lines
    .map((line) => line.substring(indentation.length))
    .join("\n")
}
