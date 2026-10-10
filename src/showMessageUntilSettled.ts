import elegantSpinner from "elegant-spinner"
import logUpdate from "log-update"

// progress goes to stderr and only to a terminal, so stdout stays parseable
const logToStderr = logUpdate.create(process.stderr)

export default async function (message, promise) {
  if (!process.stderr.isTTY) {
    return await promise
  }

  const spinner = elegantSpinner()

  const interval = setInterval(() => {
    logToStderr(message(spinner()))
  }, 66)

  try {
    return await promise
  } finally {
    clearInterval(interval)
    logToStderr.clear()
  }
}
