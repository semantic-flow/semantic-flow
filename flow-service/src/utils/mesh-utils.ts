import { basename, dirname } from 'jsr:@std/path';
import { ServiceConfigAccessor } from '../config/index.ts';
import { logger } from './logger.ts';

import { existsSync } from "https://deno.land/std@0.224.0/fs/mod.ts";

export const initializeMeshRegistry = (config: ServiceConfigAccessor, meshRegistry: Record<string, string>) => {
  const meshPaths = config.meshPaths;
  if (meshPaths && Array.isArray(meshPaths)) {
    for (const meshPath of meshPaths) {
      const meshName = basename(meshPath);
      const parentDir = dirname(meshPath);

      if (!existsSync(meshPath)) {
        logger.info(`Mesh path '${meshPath}' does not exist. Skipping registration.`);
        continue;
      }

      if (!existsSync(`${meshPath}/.git`)) {
        logger.info(`Mesh root folder '${meshPath}' exists but no '.git' folder found.`);
      }

      if (meshRegistry[meshName]) {
        logger.warn(`Mesh name collision detected: '${meshName}' already exists at path '${meshRegistry[meshName]}'. Skipping '${meshPath}'.`);
        continue;
      }

      meshRegistry[meshName] = parentDir;
      logger.info(`Discovered mesh '${meshName}' from configuration at path: ${parentDir}`);
    }
  }
};
