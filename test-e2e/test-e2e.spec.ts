import {RestClient} from 'typed-rest-client'

interface IChartVersion {
  name: string
  version: string
}

interface ICharts {
  [chartName: string]: IChartVersion[]
}

describe('e2e tests', () => {
  const client: RestClient = new RestClient('jest','http://localhost:8080/api')
  
  async function clearChartmuseum() {
    // remove everything from chartmuseum
    const res = await client.get<ICharts>('charts')
  
    for (const [chart, versions] of Object.entries(res.result || {})) {
      for (const version of versions) {
        await client.del(`charts/${version.name}/${version.version}`)
      }
    }
  }

  beforeAll(async () => {
    await clearChartmuseum()
  })
  
  afterAll(async () => {
    await clearChartmuseum()
  })
  

  it('chartmuseum is running and empty', async () => {
    const res = await client.get('charts')

    expect(res.statusCode).toBe(200)
    expect(res.result).toMatchObject({})
  })

  // before shipit

  // after shipit (with certain versions set)
})