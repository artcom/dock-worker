export default (params: Array<any>, runner: (arg1: any) => Promise<any>, concurrency: number) =>
  new Promise((resolve, reject) => {
    const queue = params.concat()
    const results = []
    let running = 0

    const run = () => {
      while (queue.length > 0 && running < concurrency) {
        const param = queue.shift()
        running++
        runner(param)
          .then(onResolve)
          .catch(onReject)
      }

      if (queue.length === 0 && running === 0) {
        resolve(results)
      }

      function onResolve(result) {
        results.push(result)
        running--
        process.nextTick(run)
      }

      function onReject(error) {
        running--
        process.nextTick(run)
        reject(error)
      }
    }
    run()
  })
