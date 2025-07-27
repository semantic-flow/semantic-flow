import { ServiceConfigAccessor } from "../config/index.ts";
//import { MESH } from '../../../flow-core/src/mesh-constants.ts';

/**
 * Composes the metadata content JSON object for a node creation event.
 *
 * @param slug - The slug identifier for the node
 * @param nodeType - The type of the node (e.g., Namespace, Reference, Dataset)
 * @param initialData - An object containing the initial metadata for the node
 * @param config - The service configuration accessor
 * @returns The metadata content JSON object
 */
export function composeMetadataContent(
  slug: string,
  nodeType: string,
  initialData: Record<string, unknown>,
  config: ServiceConfigAccessor,
  startedAtTime?: string,
): Record<string, unknown> {
  const title = typeof initialData.title === "string"
    ? initialData.title
    : slug;
  const description = typeof initialData.description === "string"
    ? initialData.description
    : `Node created for ${slug}`;
  const attributedTo = config.defaultAttributedTo;
  const delegationChain = config.defaultDelegationChain;

  const startTime = startedAtTime ?? new Date().toISOString();
  const endTime = new Date().toISOString();

  return {
    "@context": {
      "owl": "http://www.w3.org/2002/07/owl#",
      "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "dcterms": "http://purl.org/dc/terms/",
      "prov": "http://www.w3.org/ns/prov#",
      "dcat": "http://www.w3.org/ns/dcat#",
      "meta": "https://semantic-flow.github.io/ontology/meta-flow/",
      "mesh": "https://semantic-flow.github.io/ontology/mesh/",
      "node": "https://semantic-flow.github.io/ontology/node/",
      "flow": "https://semantic-flow.github.io/ontology/flow/",
    },
    "@graph": [
      {
        "@id": `../../${slug}/_handle/`,
        "@type": "mesh:Node",
        "node:hasSlug": slug,
        "dcterms:title": title,
        "dcterms:description": description,
      },
      {
        "@id": `../../${slug}/_handle/#`,
        "@type": "node:Handle",
        "mesh:relativeIdentifier": `../../${slug}/_handle/`,
        "dcterms:title": `${title} Handle`,
        "dcterms:description": `Handle for the ${slug} ${nodeType} node.`,
        "node:isHandleFor": {
          "@id": `../../${slug}/_handle/`,
        },
      },
      {
        "@id": "#creation-activity",
        "@type": "meta:NodeCreation",
        "dcterms:title": `${title} Node Creation`,
        "dcterms:description": `Creation of the ${slug} ${nodeType} node.`,
        "prov:startedAtTime": startTime,
        "prov:endedAtTime": endTime,
        "prov:wasAssociatedWith": attributedTo,
      },
      {
        "@id": "#creation-context",
        "@type": "meta:ProvenanceContext",
        "meta:forActivity": { "@id": "#creation-activity" },
        "prov:wasAttributedTo": attributedTo,
        "meta:delegationChain": delegationChain,
      },
    ],
  };
}
