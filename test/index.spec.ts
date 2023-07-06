import * as Auto from "@auto-it/core";
import { makeHooks } from "@auto-it/core/dist/utils/make-hooks";
import { dummyLog } from "@auto-it/core/dist/utils/logger";

import HelmPlugin, { IHelmPluginOptions } from "../src";
import Git from "@auto-it/core/dist/git";

const exec = jest.fn()

jest.mock(
  "@auto-it/core/dist/utils/exec-promise",
  () => (...args: any[]) => exec(...args)
);

jest.mock("@auto-it/core/dist/utils/get-current-branch", () => ({
  getCurrentBranch: () => "next"
}))

const setup = (
  mockGit?: Partial<Git>,
  options?: IHelmPluginOptions,
  checkEnv?: jest.SpyInstance,
  prereleaseBranches: string[] = ["next"],
) => {
  const plugin = new HelmPlugin(options || {});
  const hooks = makeHooks();

  // TODO: mock getCurrentBranch, execPromise

  plugin.apply(({
    checkEnv,
    hooks,
    git: mockGit,
    remote: "origin",
    logger: dummyLog(),
    prefixRelease: (r: string) => r,
    config: { prereleaseBranches },
    getCurrentVersion: () => "v1.0.0",
  } as unknown) as Auto.Auto);

  return hooks;
};

describe(HelmPlugin.name, () => {
  beforeEach(() => {
    exec.mockClear()
  })

  describe("validateConfig", () => {
    it("should error without options", async () => {
      const hooks = setup();
      await expect(
        hooks.validateConfig.promise("helm", null)
      ).resolves.toHaveLength(1);
    });
  })

  /**
   * TODO: need these tests
   * - fails without git
   * - fails with bad bump
   * - correctly bumps version
   */
  describe("version", () => {
    // do nothing without git
    it("fails without git", async () => {
      const hooks = setup();
      await hooks.version.promise({ bump: Auto.SEMVER.patch });
      expect(exec).not.toHaveBeenCalled();
    })

    // do nothing with bad bump
    it("fails with a invalid bump type", async () => {
      const hooks = setup({})
      await hooks.version.promise({bump: "wrong" as Auto.SEMVER})
      expect(exec).not.toHaveBeenCalled()
    })

    // should tag next
    it("should do stuff", async () => {
      const hooks = setup({})
      await hooks.version.promise({bump: "patch" as Auto.SEMVER})
      expect(exec).toHaveBeenCalled()
    })
  })

  /**
   * TODO: next tests
   * - fails without git
   * - fails with bad version
   * - skips if prereleases disabled
   * - preps charts with correct version and repository
   */

  /**
   * TODO: publish tests
   * - fails without git
   * - fails with invalid version
   * - skip if publihsing not enabled
   * - prep chart with correct version and repository
   */

  /** TODO: canary tests
   * - fails without git
   * - fails with invalid version bump
   * - skip if canary disabled
   * - prep chart with correct version and repository
   */

  /**
   * TODO: helm helper class
   * 
   */
})