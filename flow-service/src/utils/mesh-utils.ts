import { basename, dirname } from 'jsr:@std/path';
import { ServiceConfigAccessor } from '../config/index.ts';
import { logger } from './logger.ts';

export const initializeMeshRegistry = (config: ServiceConfigAccessor, meshRegistry: Record<string, string>) => {
  const meshPaths = config.meshPaths;
  if (meshPaths && Array.isArray(meshPaths)) {
    for (const meshPath of meshPaths) {
      const meshName = basename(meshPath);
      const parentDir = dirname(meshPath);

      if (meshRegistry[meshName]) {
        logger.warn(`Mesh name collision detected: '${meshName}' already exists at path '${meshRegistry[meshName]}'. Skipping '${meshPath}'.`);
        continue;
      }

      meshRegistry[meshName] = parentDir;
      logger.info(`Discovered mesh '${meshName}' from configuration at path: ${parentDir}`);
    }
  }
};
