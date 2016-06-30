import elegantSpinner from "elegant-spinner"
import logUpdate from "log-update"

export default async function(message, promise) {
  const spinner = elegantSpinner()

  const interval = setInterval(() => {
    logUpdate(message(spinner()))
  }, 66)

  try {
    return await promise
  } finally {
    clearInterval(interval)
    logUpdate.clear()
  }
}
