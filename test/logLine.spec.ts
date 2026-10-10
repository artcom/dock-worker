import { expect } from "chai"
import sinon from "sinon"

import Dokku from "../src/dokku"
import { parseLogLine } from "../src/logLine"

describe("Log Lines", function () {
  it("should parse JSON payloads", function () {
    const line =
      '2026-10-01T13:04:42.123Z app[web.1]: {"level":"info","message":"started"}'

    expect(parseLogLine(line)).to.deep.equal({
      timestamp: "2026-10-01T13:04:42.123Z",
      process: "web.1",
      data: { level: "info", message: "started" },
    })
  })

  it("should keep plain text payloads as message", function () {
    const line = "2026-10-01T13:04:42.123Z app[web.1]: listening on 5000"

    expect(parseLogLine(line)).to.deep.equal({
      timestamp: "2026-10-01T13:04:42.123Z",
      process: "web.1",
      message: "listening on 5000",
    })
  })

  it("should keep invalid JSON as message", function () {
    const line = "2026-10-01T13:04:42.123Z app[web.1]: {not json"

    expect(parseLogLine(line).message).to.equal("{not json")
  })

  it("should keep unprefixed lines as message", function () {
    expect(parseLogLine("some output")).to.deep.equal({
      message: "some output",
    })
  })

  it("should request logs with line count", async function () {
    const dokku = new Dokku("localhost")
    const mock = sinon.mock(dokku)
    mock
      .expects("sendCommand")
      .withArgs("logs my-app --num 20")
      .returns(Promise.resolve("line\n"))

    expect(await dokku.logs("my-app", 20)).to.equal("line\n")
    mock.verify()
  })
})
