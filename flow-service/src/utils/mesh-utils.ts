import { logger } from './logger.ts';
import { basename, dirname, existsSync } from '../../../flow-core/src/deps.ts';
import { singletonServiceConfigAccessor as config } from '../config/resolution/service-config-accessor.ts';

export const initializeMeshRegistry = (
  meshRegistry: Record<string, string>,
) => {
  const meshPaths = config.getMeshPaths;
  if (meshPaths && Array.isArray(meshPaths)) {
    for (const meshPath of meshPaths) {
      const meshName = basename(meshPath);
      const parentDir = dirname(meshPath);

      if (!existsSync(meshPath)) {
        logger.info(
          `Mesh path '${meshPath}' does not exist. Skipping registration.`,
        );
        continue;
      }

      if (!existsSync(`${meshPath}/.git`)) {
        logger.info(
          `Mesh root folder '${meshPath}' exists but no '.git' folder found.`,
        );
      }

      if (meshRegistry[meshName]) {
        logger.warn(
          `Mesh name collision detected: '${meshName}' already exists at path '${meshRegistry[meshName]
          }'. Skipping '${meshPath}'.`,
        );
        continue;
      }

      meshRegistry[meshName] = parentDir;
      logger.info(
        `Discovered mesh '${meshName}' from configuration at path: ${parentDir}`,
      );
    }
  }
};
