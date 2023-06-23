import {
  Auto,
  IPlugin,
  execPromise,
  DEFAULT_PRERELEASE_BRANCHES,
  getCurrentBranch,
  determineNextVersion,
  validatePluginConfiguration,
} from "@auto-it/core";
import { inc, ReleaseType } from "semver";
import * as t from "io-ts";
import { readdir, readFile, cp, writeFile, rm, mkdir } from "fs/promises";
import { join } from "path";

const pluginOptions = t.partial({
  /** Path to use for charts */
  path: t.string,
  /** Look for all charts in path */
  recursive: t.boolean,
  /** Push */
  push: t.boolean,
  /** Force push versions */
  forcePush: t.boolean,
  /** Enable canary deployments */
  enableCanary: t.boolean,
  /** Enable prerelease deployments */
  enablePreleases: t.boolean,
  /** Replace version string */
  replaceVersionString: t.boolean,
  /** Replace file references with repository */
  replaceFileWithRepository: t.boolean,
  /** Repository to use */
  repository: t.string,
  /** Version string to use */
  versionString: t.string,
  /** Use helm docs */
  useHelmDocs: t.boolean,
  /** Publish path to use */
  publishPath: t.string,
  /** Repository to publish to */
  publishRepository: t.string,
});

enum TOOLS {
  HELM = "helm",
  HELM_DOCS = "helm-docs",
}

enum HELM_PLUGIN_ENV_VARS {
  PATH = "HELM_PLUGIN_PATH",
  RECURSIVE = "HELM_PLUGIN_RECURSIVE",
  FORCE_PUSH = "HELM_PLUGIN_FORCE_PUSH",
  PUSH = "HELM_PLUGIN_PUSH",
  ENABLE_CANARY = "HELM_PLUGIN_ENABLE_CANARY",
  ENABLE_PRERELEASES = "HELM_PLUGIN_ENABLE_PRERELEASE",
  REPLACE_VERSION_STRING = "HELM_PLUGIN_REPLACE_VERSION_STRING",
  REPLACE_FILE_WITH_REPOSITORY = "HELM_PLUGIN_REPLACE_FILE_WITH_REPOSITORY",
  REPOSITORY = "HELM_PLUGIN_REPOSITORY",
  VERSION_STRING = "HELM_PLUGIN_VERSION_STRING",
  USE_HELM_DOCS = "HELM_PLUGIN_USE_HELM_DOCS",
  PUBLISH_PATH = "HELM_PLUGIN_PUBLISH_PATH",
  PUBLISH_REPOSITORY = "HELM_PLUGIN_PUBLISH_REPOSITORY",
}

function toBoolean(v?: string | number | boolean) {
  return String(v).search(/(true|1)/i) >= 0;
}

export type IHelmPluginOptions = t.TypeOf<typeof pluginOptions>;

export default class HelmPlugin implements IPlugin {
  /** The name of the plugin */
  name = "helm";

  private readonly options: Required<IHelmPluginOptions>;

  constructor(options: IHelmPluginOptions) {
    this.options = {
      path: process.env[HELM_PLUGIN_ENV_VARS.PATH] || options?.path || ".",
      enableCanary: toBoolean(
        process.env[HELM_PLUGIN_ENV_VARS.ENABLE_CANARY] ||
          options?.enableCanary ||
          false
      ),
      enablePreleases: toBoolean(
        process.env[HELM_PLUGIN_ENV_VARS.ENABLE_PRERELEASES] ||
          options?.enablePreleases ||
          false
      ),
      push: toBoolean(
        process.env[HELM_PLUGIN_ENV_VARS.PUSH] || options?.push || false
      ),
      forcePush: toBoolean(
        process.env[HELM_PLUGIN_ENV_VARS.FORCE_PUSH] ||
          options?.forcePush ||
          false
      ),
      recursive: toBoolean(
        process.env[HELM_PLUGIN_ENV_VARS.RECURSIVE] ||
          options?.recursive ||
          false
      ),
      replaceFileWithRepository: toBoolean(
        process.env[HELM_PLUGIN_ENV_VARS.REPLACE_FILE_WITH_REPOSITORY] ||
          options?.replaceFileWithRepository ||
          false
      ),
      replaceVersionString: toBoolean(
        process.env[HELM_PLUGIN_ENV_VARS.REPLACE_VERSION_STRING] ||
          options?.replaceVersionString ||
          true
      ),
      repository:
        process.env[HELM_PLUGIN_ENV_VARS.REPOSITORY] ||
        options?.repository ||
        "",
      versionString:
        process.env[HELM_PLUGIN_ENV_VARS.VERSION_STRING] ||
        options?.versionString ||
        "0.0.0-local",
      useHelmDocs: toBoolean(
        process.env[HELM_PLUGIN_ENV_VARS.USE_HELM_DOCS] ||
          options?.useHelmDocs ||
          false
      ),
      publishPath:
        process.env[HELM_PLUGIN_ENV_VARS.PUBLISH_PATH] ||
        options.publishPath ||
        "publish",
      publishRepository:
        process.env[HELM_PLUGIN_ENV_VARS.PUBLISH_REPOSITORY] ||
        options.publishRepository ||
        "",
    };
  }

  apply(auto: Auto) {
    const options = this.options;

    async function publishCharts() {
      if (!options.push) {
        auto.logger.log.info("Skipping publish");
        return;
      }

      if (!options.publishRepository) {
        throw new Error("publish repository must be set");
      }

      const chartsToPublish = (
        await readdir(options.publishPath, {
          withFileTypes: true,
        })
      )
        .filter((i) => i.isFile() && i.name.search(/\.tgz$/) >= 0)
        .map((i) => join(options.publishPath, i.name));

      for (const chart of chartsToPublish) {
        auto.logger.log.info(`Publishing ${chart}`);
        await execPromise(TOOLS.HELM, [
          "cm-push",
          ...(options.forcePush ? ["-f"] : []),
          chart,
          options.publishRepository,
        ]);
      }
    }

    async function prepCharts(version: string, repository?: string) {
      await rm(options.publishPath, { recursive: true, force: true });
      await mkdir(options.publishPath, { recursive: true });
      await cp(options.path, options.publishPath, {
        recursive: true,
      });

      // replace all versions with the current version
      for (const chart of await getChartDirs()) {
        const chartPath = join(options.publishPath, chart);
        if (options.replaceVersionString) {
          for (const file of await findMatchingChartFiles(chartPath)) {
            await inlineReplace(join(chartPath, file), (content) => {
              return content.replace(
                new RegExp(options.versionString, "ig"),
                version
              );
            });
          }
        }
      }

      if (options.useHelmDocs) {
        auto.logger.log.info("Updating documentation");
        await execPromise(TOOLS.HELM_DOCS, ["-u", "publish", "-s", "alphanum"]);
      } else {
        auto.logger.log.info("Skipping documentation generation");
      }

      for (const chartDir of await getChartDirs()) {
        await prepChart(
          join(options.publishPath, chartDir),
          version,
          repository
        );
      }

      for (const chartDir of await getChartDirs()) {
        await rm(join(options.publishPath, chartDir), {
          recursive: true,
          force: true,
        });
      }
    }

    async function inlineReplace(
      path: string,
      replacers: (contents: string) => string
    ) {
      auto.logger.log.debug(`Inline replacement for ${path}`);

      const contents = replacers((await readFile(path)).toString());

      return await writeFile(path, contents);
    }

    async function findMatchingChartFiles(chartPath: string) {
      const MATCHER = /(readme\.md)|(chart\.ya?ml)|(chart\.lock)/i;
      return (await readdir(chartPath, { withFileTypes: true }))
        .filter((i) => i.isFile())
        .map((i) => i.name)
        .filter((i) => i.search(MATCHER) >= 0);
    }

    async function prepChart(
      chartPath: string,
      version: string,
      repository?: string
    ) {
      auto.logger.log.info(`Creating chart: ${chartPath} vedrsion ${version}`);

      // remove charts dir external dependencies
      await rm(join(chartPath, "charts", "*.tgz"), {
        recursive: true,
        force: true,
      });

      // update dependencies
      await execPromise(TOOLS.HELM, ["dep", "up", chartPath]);

      // update file references with repo aliases
      if (repository) {
        for (const file of await findMatchingChartFiles(chartPath)) {
          await inlineReplace(join(chartPath, file), (contents) => {
            return contents.replace(/file:\/\/[^\s]+/g, `'${repository}'`);
          });
        }
      }

      // package the chart
      await execPromise(TOOLS.HELM, [
        "package",
        chartPath,
        "-d",
        options.publishPath,
      ]);
    }

    async function getTag() {
      if (!auto.git) return auto.prefixRelease("0.0.0")
      
      try {
        return await auto.git.getLatestTagInBranch();
      } catch (error) {
        return auto.prefixRelease("0.0.0");
      }
    }

    async function getChartDirs() {
      if (options.recursive)
        return (
          await readdir(options.path, {
            recursive: options.recursive,
            withFileTypes: true,
          })
        )
          .filter((i) => i.isDirectory())
          .map((i) => i.name);

      return options.path;
    }

    auto.hooks.beforeRun.tapPromise(this.name, async () => {
      auto.logger.log.info("Checking for helm...");
      await execPromise(TOOLS.HELM, ["version"]);

      if (this.options.useHelmDocs) {
        auto.logger.log.info("Checking for helm-docs...");
        await execPromise(TOOLS.HELM_DOCS, ["--version"]);
      } else {
        auto.logger.log.info("Skipping check for helm-docs");
      }
    });

    auto.hooks.getPreviousVersion.tapPromise(this.name, async () => {
      if (!auto.git) {
        throw new Error(
          "Can't calculate previous version without Git initialized!"
        );
      }

      return getTag();
    });

    auto.hooks.validateConfig.tapPromise(this.name, async (name, options) => {
      if (name === this.name || name === `@auto-it/${this.name}`) {
        return validatePluginConfiguration(this.name, pluginOptions, options);
      }
    });

    auto.hooks.canary.tapPromise(
      this.name,
      async ({ bump, canaryIdentifier, dryRun }) => {
        if (!auto.git) return;

        if (!this.options.enableCanary) {
          auto.logger.log.info(`Canary releases are not enabled. Skipping.`);
          return;
        }

        const lastRelease = await auto.git.getLatestRelease();
        const current = await auto.getCurrentVersion(lastRelease);
        const nextVersion = inc(current, bump as ReleaseType);
        const canaryVersion = `${nextVersion}-${canaryIdentifier}`;

        if (dryRun) {
          auto.logger.log.info(
            `[DRY RUN] Would have created canary version: ${canaryVersion}`
          );
          //return
        }

        auto.logger.log.info(`Creating canary version: ${canaryVersion}`);
        await prepCharts(canaryVersion, this.options.repository);
        await publishCharts();
      }
    );

    auto.hooks.publish.tapPromise(this.name, async (args) => {
      if (!auto.git) return;

      const lastTag = await getTag();
      const newTag = inc(lastTag, args.bump as ReleaseType);

      if (!newTag) {
        auto.logger.log.info("No release found, doing nothing");
        return;
      }

      const prefixedTag = auto.prefixRelease(newTag);

      await prepCharts(prefixedTag, this.options.repository);
    });

    auto.hooks.version.tapPromise(this.name, async (args) => {
      if (!auto.git) return;

      const lastTag = await getTag();
      const newTag = inc(lastTag, args.bump as ReleaseType);

      if (!newTag) {
        auto.logger.log.info("No release found, doing nothing");
        return;
      }

      const prefixedTag = auto.prefixRelease(newTag);

      auto.logger.log.warn(`DOING VERSION: ${prefixedTag}`);
    });

    auto.hooks.next.tapPromise(this.name, async (prereleaseVersions, args) => {
      if (!auto.git) return prereleaseVersions;

      const prereleaseBranches =
        auto.config?.prereleaseBranches ?? DEFAULT_PRERELEASE_BRANCHES;
      const branch = getCurrentBranch() || "";
      const prereleaseBranch = prereleaseBranches.includes(branch)
        ? branch
        : prereleaseBranches[0];
      const lastRelease = await auto.git.getLatestRelease();
      const current =
        (await auto.git.getLastTagNotInBaseBranch(prereleaseBranch)) ||
        (await auto.getCurrentVersion(lastRelease));
      const prerelease = auto.prefixRelease(
        determineNextVersion(lastRelease, current, args.bump, prereleaseBranch)
      );

      prereleaseVersions.push(prerelease);

      await prepCharts(prerelease, this.options.repository);
      return prereleaseVersions;
    });
  }
}
