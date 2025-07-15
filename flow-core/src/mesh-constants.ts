// flow-core/src/constants.ts
export const MESH_CONSTANTS = {
  // Component directory names
  CONFIG_COMPONENT: "_config-component",
  META_COMPONENT: "_meta-component",
  ASSETS_COMPONENT: "_assets",
  NEXT_LAYER: "_next",
  CURRENT_LAYER: "_current",

  // Versioning directories
  VERSION_PREFIX: "_v",
  VERSION_SERIES: "_v-series",
  REFERENCE_DIR: "_ref",
  HANDLE_DIR: "_handle",

  // System files
  CONFIG_DEFAULTS_FILE: "flow-config-defaults.jsonld",
  CONFIG_FILE: "flow-config.jsonld",
  README_FILE: "README.md",


  // Ontology namespaces
  FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/flow/",
  SERVICE_ONTOLOGY: "https://semantic-flow.github.io/ontology/flow-service/",
  NODE_ONTOLOGY: "https://semantic-flow.github.io/ontology/node-config/"
} as const;

// Usage throughout codebase
export function getNodeConfigPath(nodePath: string): string {
  return `${nodePath}/${MESH_CONSTANTS.CONFIG_COMPONENT}`;
}
