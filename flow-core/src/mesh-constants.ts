// flow-core/src/constants.ts
const CONFIG = "config";
const META = "meta";
const REF = "ref";
const DATA = "data";
const NEXT = "next";
const CURRENT = "current";


export const MESH = {
  // Flow slugs
  CONFIG,
  META,
  REF,
  DATA,
  NEXT,
  CURRENT,

  // flow folders

  CONFIG_FLOW_DIR: "_" + CONFIG + "-flow",
  META_FLOW_DIR: "_" + META + "-flow",
  REF_FLOW_DIR: "_" + REF + "-flow",
  DATA_FLOW_DIR: "_" + DATA + "-flow",

  NEXT_SNAPSHOT_DIR: NEXT,
  CURRENT_SNAPSHOT_DIR: "_" + CURRENT,
  VERSION_SNAPSHOT_PREFIX: "_v",

  // Other element directory names
  HANDLE_DIR: "_handle",
  ASSETS_DIR: "_assets",

  README_FILE: "README.md",
  CHANGELOG_FILE: "CHANGELOG.md",

  // Miscellaneous

  API_IDENTIFIER_PATH_SEPARATOR: "~",

  // Ontology namespaces
  MESH_ONTOLOGY: "https://semantic-flow.github.io/ontology/mesh/",
  NODE_ONTOLOGY: "https://semantic-flow.github.io/ontology/node/",
  FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/flow/",
  CONFIG_FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/config-flow/",
  META_FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/meta-flow/",
  FLOW_SERVICE_ONTOLOGY: "https://semantic-flow.github.io/ontology/flow-service/"
} as const;

// Usage throughout codebase

// config
export function getConfigFlowPath(nodePath: string): string {
  return `${nodePath}/${MESH.CONFIG_FLOW_DIR}/`;
}

export function getCurrentConfigSnapshotPath(nodePath: string): string {
  return `${getConfigFlowPath(nodePath)}/${MESH.CURRENT_SNAPSHOT_DIR}/`;
}

export function getCurrentConfigDistPath(nodePath: string): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getCurrentConfigSnapshotPath(nodePath)}${lastSegment}_${MESH.CONFIG}_${MESH.CURRENT}.jsonld`;
}

export function getNextConfigSnapshotPath(nodePath: string): string {
  return `${getConfigFlowPath(nodePath)}/${MESH.NEXT_SNAPSHOT_DIR}/`;
}

export function getNextConfigDistPath(nodePath: string): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getNextConfigSnapshotPath(nodePath)}${lastSegment}_${MESH.CONFIG}_${MESH.NEXT}.jsonld`;
}

export function getVersionConfigSnapshotPath(nodePath: string, version: number): string {
  return `${getConfigFlowPath(nodePath)}/${MESH.VERSION_SNAPSHOT_PREFIX}${version}/`;
}

export function getVersionConfigDistPath(nodePath: string, version: number): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getVersionConfigSnapshotPath(nodePath, version)}${lastSegment}_${MESH.CONFIG}_${MESH.VERSION_SNAPSHOT_PREFIX}${version}.jsonld`;
}

// meta
export function getMetaFlowPath(nodePath: string): string {
  return `${nodePath}/${MESH.META_FLOW_DIR}/`;
}

export function getCurrentMetaSnapshotPath(nodePath: string): string {
  return `${getMetaFlowPath(nodePath)}/${MESH.CURRENT_SNAPSHOT_DIR}/`;
}

export function getCurrentMetaDistPath(nodePath: string): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getCurrentMetaSnapshotPath(nodePath)}${lastSegment}_${MESH.META}_${MESH.CURRENT}.jsonld`;
}

export function getNextMetaSnapshotPath(nodePath: string): string {
  return `${getMetaFlowPath(nodePath)}/${MESH.NEXT_SNAPSHOT_DIR}/`;
}

export function getNextMetaDistPath(nodePath: string): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getNextMetaSnapshotPath(nodePath)}${lastSegment}_${MESH.META}_${MESH.NEXT}.jsonld`;
}

export function getVersionMetaSnapshotPath(nodePath: string, version: number): string {
  return `${getMetaFlowPath(nodePath)}/${MESH.VERSION_SNAPSHOT_PREFIX}${version}/`;
}

export function getVersionMetaDistPath(nodePath: string, version: number): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getVersionMetaSnapshotPath(nodePath, version)}${lastSegment}_${MESH.META}_${MESH.VERSION_SNAPSHOT_PREFIX}${version}.jsonld`;
}

// REF
export function getRefFlowPath(nodePath: string): string {
  return `${nodePath}/${MESH.REF_FLOW_DIR}/`;
}

export function getCurrentRefSnapshotPath(nodePath: string): string {
  return `${getRefFlowPath(nodePath)}/${MESH.CURRENT_SNAPSHOT_DIR}/`;
}

export function getCurrentRefDistPath(nodePath: string): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getCurrentRefSnapshotPath(nodePath)}${lastSegment}_${MESH.REF}_${MESH.CURRENT}.jsonld`;
}

export function getNextRefSnapshotPath(nodePath: string): string {
  return `${getRefFlowPath(nodePath)}/${MESH.NEXT_SNAPSHOT_DIR}/`;
}

export function getNextRefDistPath(nodePath: string): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getNextRefSnapshotPath(nodePath)}${lastSegment}_${MESH.REF}_${MESH.NEXT}.jsonld`;
}

export function getVersionRefSnapshotPath(nodePath: string, version: number): string {
  return `${getRefFlowPath(nodePath)}/${MESH.VERSION_SNAPSHOT_PREFIX}${version}/`;
}

export function getVersionRefDistPath(nodePath: string, version: number): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getVersionRefSnapshotPath(nodePath, version)}${lastSegment}_${MESH.REF}_${MESH.VERSION_SNAPSHOT_PREFIX}${version}.jsonld`;
}

// data
export function getDataFlowPath(nodePath: string): string {
  return `${nodePath}/${MESH.DATA_FLOW_DIR}/`;
}

export function getCurrentDataSnapshotPath(nodePath: string): string {
  return `${getDataFlowPath(nodePath)}/${MESH.CURRENT_SNAPSHOT_DIR}/`;
}

export function getCurrentDataDistPath(nodePath: string): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getCurrentDataSnapshotPath(nodePath)}${lastSegment}_${MESH.DATA}_${MESH.CURRENT}.jsonld`;
}

export function getNextDataSnapshotPath(nodePath: string): string {
  return `${getDataFlowPath(nodePath)}/${MESH.NEXT_SNAPSHOT_DIR}/`;
}

export function getNextDataDistPath(nodePath: string): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getNextDataSnapshotPath(nodePath)}${lastSegment}_${MESH.DATA}_${MESH.NEXT}.jsonld`;
}

export function getVersionDataSnapshotPath(nodePath: string, version: number): string {
  return `${getDataFlowPath(nodePath)}/${MESH.VERSION_SNAPSHOT_PREFIX}${version}/`;
}

export function getVersionDataDistPath(nodePath: string, version: number): string {
  const lastSegment = nodePath.substring(nodePath.lastIndexOf("/") + 1);
  return `${getVersionDataSnapshotPath(nodePath, version)}${lastSegment}_${MESH.DATA}_${MESH.VERSION_SNAPSHOT_PREFIX}${version}.jsonld`;
}
