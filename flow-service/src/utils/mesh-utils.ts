import { logger } from './service-logger.ts';
import { basename, dirname, existsSync } from '../../../flow-core/src/deps.ts';
import { singletonServiceConfigAccessor as config } from '../config/resolution/service-config-accessor.ts';

// Global mesh registry
export const meshRegistry: Record<string, string> = {};

export const initializeMeshRegistry = async () => {
  const meshPaths = await config.getMeshPaths();
  if (meshPaths && Array.isArray(meshPaths)) {
    for (const meshPath of meshPaths) {
      const meshName = basename(meshPath);
      const parentDir = dirname(meshPath);

      if (!existsSync(meshPath)) {
        logger.info(
          `Mesh path '${meshPath}' does not exist. Skipping registration.`,
          {
            operation: 'mesh-scan',
            component: 'mesh-scanner',
            metadata: { meshPath },
          },
        );
        continue;
      }

      if (!existsSync(`${meshPath}/.git`)) {
        logger.info(
          `Mesh root folder '${meshPath}' exists but no '.git' folder found.`,
          {
            operation: 'mesh-scan',
            component: 'mesh-scanner',
            metadata: { meshPath },
          },
        );
      }

      if (meshRegistry[meshName]) {
        logger.warn(
          `Mesh name collision detected: '${meshName}' already exists at path '${meshRegistry[meshName]
          }'. Skipping '${meshPath}'.`,
          {
            operation: 'mesh-scan',
            component: 'mesh-scanner',
            metadata: {
              meshName,
              existingPath: meshRegistry[meshName],
              skippedPath: meshPath,
            },
          },
        );
        continue;
      }

      meshRegistry[meshName] = parentDir;
      logger.info(
        `Discovered mesh '${meshName}' from configuration at path: ${parentDir}`,
        {
          operation: 'mesh-scan',
          component: 'mesh-scanner',
          metadata: { meshName, parentDir },
        },
      );
    }
  }
};
