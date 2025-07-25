// flow-core/src/constants.ts
export const MESH_CONSTANTS = {
  // Flow directory names
  CONFIG_FLOW_DIR: "_config-flow",
  META_FLOW_DIR: "_meta-flow",
  REFERENCE_FLOW_DIR: "_ref-flow",
  DATA_FLOW_DIR: "_data-flow",

  // Other element directory names
  HANDLE_DIR: "_handle",
  ASSETS_COMPONENT_DIR: "_assets",
  NEXT_SNAPSHOT_DIR: "_next",
  CURRENT_SNAPSHOT_DIR: "_current",
  VERSION_PREFIX: "_v",

  // System files
  CONFIG_FILE: "flow-config.jsonld",
  README_FILE: "README.md",
  CHANGELOG_FILE: "CHANGELOG.md",

  // Ontology namespaces
  MESH_ONTOLOGY: "https://semantic-flow.github.io/ontology/mesh/",
  NODE_ONTOLOGY: "https://semantic-flow.github.io/ontology/node/",
  FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/flow/",
  CONFIG_FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/config-flow/",
  META_FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/meta-flow/",
  FLOW_SERVICE_ONTOLOGY: "https://semantic-flow.github.io/ontology/flow-service/"
} as const;

// Usage throughout codebase
export function getNodeConfigPath(nodePath: string): string {
  return `${nodePath}/${MESH_CONSTANTS.CONFIG_FLOW_DIR}/${MESH_CONSTANTS.CONFIG_FILE}`;
}
