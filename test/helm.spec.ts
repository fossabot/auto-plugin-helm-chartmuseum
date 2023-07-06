import {ILogger} from '@auto-it/core'
import { Helm } from "../src/helm";
import {rm, mkdir, cp} from 'fs/promises'

const exec = jest.fn()
const logger = jest.fn(() => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

jest.mock('fs/promises')

jest.mock(
  "@auto-it/core/dist/utils/exec-promise",
  () => (...args: any[]) => exec(...args)
);

describe(Helm.name, () => {
  let helm: Helm

  beforeEach(() => {
    logger.mockClear()
    exec.mockClear()
    helm = new Helm(logger() as any, {})
  })
  
  describe.only('prepCharts', () => {
    beforeEach(() => {
      jest.spyOn(helm,'inlineReplace').mockImplementation(jest.fn())
      jest.spyOn(helm,'findMatchingChartFiles').mockResolvedValue(['dummyfile'])
      jest.spyOn(helm,'prepChart').mockImplementation(jest.fn())
      jest.spyOn(helm,'getChartDirs').mockResolvedValue(['test1','test2'])
    })

    it('works', async () => {
    
      
      await helm.prepCharts('1234','src','dest')

      expect(helm.inlineReplace).toHaveBeenCalledTimes(2)
      expect(helm.prepChart).toHaveBeenCalledWith(
        [
          "dest/test1", "dest", "1234", {recursive: true, replaceFileWithRepository: true, replaceVersionToken: true}
        ],
        [
          "dest/test2", "dest", "1234", {recursive: true, replaceFileWithRepository: true, replaceVersionToken: true}
        ]
      )
      expect(helm.findMatchingChartFiles).toHaveBeenCalledWith(6)
      expect(rm).toBeCalledWith(1)
      expect(mkdir).toBeCalledWith(2)
      expect(cp).toBeCalledWith(3)
    })
  })
})