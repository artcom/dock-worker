import elegantSpinner from "elegant-spinner"
import { logUpdateStderr } from "log-update"

export default async function (message, promise) {
  // progress goes to stderr and only to a terminal, so stdout stays parseable
  if (!process.stderr.isTTY) {
    return await promise
  }

  const spinner = elegantSpinner()

  const interval = setInterval(() => {
    logUpdateStderr(message(spinner()))
  }, 66)

  try {
    return await promise
  } finally {
    clearInterval(interval)
    logUpdateStderr.clear()
  }
}
