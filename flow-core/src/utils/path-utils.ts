// Utility functions for path handling in flow-core

import { normalize } from '../deps.ts';

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
 * Normalizes a folder path by ensuring it ends with a slash.
 * If the path is empty, it returns "/".
 *
 * @param folderPath - The folder path to normalize
 * @returns The normalized folder path
 */

export function normalizeFolderPath(folderPath: string): string {
  if (!folderPath) return "/";
  const path = normalize(folderPath);
  return path.endsWith("/") ? path : path + "/";
}

/**
 * Safely extracts the last segment of a path.
 * Removes trailing slashes, then returns the substring after the last slash.
 * If no slash is present, returns the entire path.
 *
 * @param path - The filesystem path string
 * @returns The last segment of the path
 */
export function getLastPathSegment(path: string): string {
  if (!path) return path;
  // Remove trailing slashes
  let trimmedPath = path;
  while (trimmedPath.endsWith('/')) {
    trimmedPath = trimmedPath.slice(0, -1);
  }
  const lastSlashIndex = trimmedPath.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return trimmedPath;
  }
  return trimmedPath.substring(lastSlashIndex + 1);
}
