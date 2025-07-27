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

  NEXT_SNAPSHOT_DIR: "_" + NEXT,
  CURRENT_SNAPSHOT_DIR: "_" + CURRENT,
  VERSION_SNAPSHOT_PREFIX: "_v",

  // Other element directory names
  HANDLE_DIR: "_handle",
  ASSETS_DIR: "_assets",

  README_FILE: "README.md",
  CHANGELOG_FILE: "CHANGELOG.md",

  // Miscellaneous

  API_IDENTIFIER_PATH_SEPARATOR: "~",
  API_PORTAL_ROUTE: "/api-docs",

  // Ontology namespaces
  MESH_ONTOLOGY: "https://semantic-flow.github.io/ontology/mesh/",
  NODE_ONTOLOGY: "https://semantic-flow.github.io/ontology/node/",
  FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/flow/",
  CONFIG_FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/config-flow/",
  META_FLOW_ONTOLOGY: "https://semantic-flow.github.io/ontology/meta-flow/",
  FLOW_SERVICE_ONTOLOGY: "https://semantic-flow.github.io/ontology/flow-service/"
} as const;

