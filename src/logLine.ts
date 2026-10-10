export type LogLine = {
  timestamp?: string
  process?: string
  message?: string
  data?: object
}

// dokku prefixes each line, e.g. `2026-10-01T13:04:42.123Z app[web.1]: {...}`
const LINE_REGEX = /^(\d{4}-\d{2}-\d{2}T\S+)\s+\S+?\[([^\]]+)\]:\s?(.*)$/

export function parseLogLine(line: string): LogLine {
  const match = LINE_REGEX.exec(line)
  if (!match) {
    return { message: line }
  }

  const [, timestamp, process, rest] = match
  const data = parseObject(rest)
  return data
    ? { timestamp, process, data }
    : { timestamp, process, message: rest }
}

function parseObject(text: string): object | undefined {
  if (!text.startsWith("{")) {
    return undefined
  }

  try {
    const value = JSON.parse(text)
    return typeof value === "object" && value !== null ? value : undefined
  } catch {
    return undefined
  }
}
