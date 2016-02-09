import elegantSpinner from "elegant-spinner"
import logUpdate from "log-update"

export default function(message, promise) {
  const spinner = elegantSpinner()

  const interval = setInterval(function() {
    logUpdate(message(spinner()))
  }, 66)

  function stop() {
    clearInterval(interval)
    logUpdate.clear()
  }

  return promise.then(
    (result) => {
      stop()
      return result
    },
    (error) => {
      stop()
      throw error
    }
  )
}
