/* eslint-env mocha */

import {expect} from "chai"
import tmp from "tmp"

import CredentialStore from "../src/credentialStore"

describe("Credential Store", function() {
  beforeEach(function(done) {
    tmp.file((error, path) => {
      if (error) {
        throw error
      }

      this.store = new CredentialStore(path)
      done()
    })
  })

  afterEach(function() {
    this.store.listCredentials().forEach((host) => {
      this.store.deleteCredentials(host)
    })
  })

  it("should throw when credentials are not found", function() {
    expect(() => this.store.getCredentials("unknown")).to.throw
  })

  it("should list stored credentials", function() {
    expect(this.store.listCredentials()).to.be.empty
    this.store.setCredentials("myHost", "myAccount", "myPassword")
    expect(this.store.listCredentials()).to.deep.equal(["myHost"])
  })

  it("should return stored credentials", function() {
    this.store.setCredentials("myHost", "myAccount", "myPassword")
    expect(this.store.getCredentials("myHost")).to.deep.equal({
      account: "myAccount",
      password: "myPassword"
    })
  })

  it("should overwrite stored credentials", function() {
    this.store.setCredentials("myHost", "myAccount", "myPassword")
    this.store.setCredentials("myHost", "myNewAccount", "myNewPassword")
    expect(this.store.getCredentials("myHost")).to.deep.equal({
      account: "myNewAccount",
      password: "myNewPassword"
    })
  })

  it("should delete stored credentials", function() {
    this.store.setCredentials("myHost", "myAccount", "myPassword")
    this.store.deleteCredentials("myHost")
    expect(() => this.store.getCredentials("myHost")).to.throw
  })
})
