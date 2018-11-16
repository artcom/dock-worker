export default (data: Array<any>, runner: (arg1: any) => Promise<any>, concurrency: number) =>
  new Promise((resolve, reject) => {
    const que = data.concat()
    const results = []
    let running = 0

    const run = () => {
      while (que.length > 0 && running < concurrency) {
        const data = que.shift()
        running++
        runner(data).then(result => {
          results.push(result)
          running--
          process.nextTick(run)
        }).catch(error => {
          running--
          process.nextTick(run)
          reject(error)
        })
      }

      if (que.length === 0 && running === 0) {
        resolve(results)
      }
    }
    run()
  })
