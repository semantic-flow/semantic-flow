// Utility functions for path handling in flow-core

import { MESH } from '../mesh-constants.ts';

/**
 * Converts a node relative path to a meta relative path by prepending "../../"
 * This is used to navigate from a node's directory to its meta directory.
 *
 * @param nodeRelativePath - The relative path of the node
 * @returns The relative path to the meta directory
 */
export function convertNodeRelativePathToMetaRelativePath(nodeRelativePath: string): string {
  return `../../${nodeRelativePath}`;
}

/**
 * Normalizes a node path to ensure it does not start with a slash or "./"
 * and uses consistent separators.
 *
 * @param nodePath - The node path to normalize
 * @returns The normalized node path
 */
export function normalizeNodePath(nodePath: string): string {
  if (!nodePath) return '';
  let normalized = nodePath;
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  // Additional normalization can be added here if needed
  return normalized;
}

/**
 * Extracts the last segment of a node path.
 *
 * @param nodePath - The node path string
 * @returns The last segment of the path
 */
export function getLastSegment(nodePath: string): string {
  const parts = nodePath.split('/');
  return parts[parts.length - 1] || '';
}
