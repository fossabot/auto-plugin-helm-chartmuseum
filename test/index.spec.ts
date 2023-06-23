import * as Auto from "@auto-it/core";
import { makeHooks } from "@auto-it/core/dist/utils/make-hooks";
import { dummyLog } from "@auto-it/core/dist/utils/logger";

import DockerPlugin, { IHelmPluginOptions } from "../src";

const exec = jest.fn();
jest.mock("../../../packages/core/dist/utils/get-current-branch", () => ({
  getCurrentBranch: () => "next",
}));
jest.mock(
  "../../../packages/core/dist/utils/exec-promise",
  () => (...args: any[]) => exec(...args)
);

const registry = "registry.io/app";

const setup = (
  mockGit?: any,
  options?: IHelmPluginOptions,
  checkEnv?: jest.SpyInstance,
  prereleaseBranches: string[] = ["next"],
) => {
  const plugin = new DockerPlugin(options);
  const hooks = makeHooks();

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

describe("Docker Plugin", () => {
  beforeEach(() => {
    exec.mockClear();
  });

  describe("validateConfig", () => {
    test("should error without options", async () => {
      const hooks = setup();
      await expect(
        hooks.validateConfig.promise("docker", null)
      ).resolves.toHaveLength(1);
    });
  })
})