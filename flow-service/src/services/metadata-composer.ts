import { MESH } from '../../../flow-core/src/mesh-constants.ts';

/**
 * Composes the metadata content JSON object for a node creation event.
 *
 * @param slug - The slug identifier for the node
 * @param nodeType - The type of the node (e.g., Namespace, Reference, Dataset)
 * @param title - The title of the node
 * @param description - The description of the node
 * @param attributedTo - Attribution object for provenance
 * @param delegationChain - Delegation chain object for provenance
 * @returns The metadata content JSON object
 */
export function composeMetadataContent(
  slug: string,
  nodeType: string,
  title: string,
  description: string,
  attributedTo: Record<string, unknown>,
  delegationChain: unknown
): Record<string, unknown> {
  const snapshotFileName = 'meta-flow.jsonld';

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
      "flow": "https://semantic-flow.github.io/ontology/flow/"
    },
    "@graph": [
      {
        "@id": "#meta-flow-v1-activity",
        "@type": "meta:NodeCreation",
        "dcterms:title": `${title} Node Creation`,
        "dcterms:description": `Creation of the ${slug} ${nodeType} node.`,
        "prov:startedAtTime": new Date().toISOString(),
        "prov:endedAtTime": new Date().toISOString(),
        "prov:wasAssociatedWith": attributedTo
      },
      {
        "@id": `../../${slug}/_handle/`,
        "@type": "mesh:Node",
        "node:hasSlug": slug,
        "dcterms:title": title,
        "dcterms:description": description
      },
      {
        "@id": `../../${slug}/_handle/#`,
        "@type": "node:Handle",
        "mesh:relativeIdentifier": `../../${slug}/_handle/`,
        "dcterms:title": `${title} Handle`,
        "dcterms:description": `Handle for the ${slug} ${nodeType} node.`,
        "node:isHandleFor": {
          "@id": `../../${slug}/_handle/`
        }
      },
      {
        "@id": "#meta-flow-v1-context",
        "@type": "meta:ProvenanceContext",
        "meta:forActivity": { "@id": "#meta-flow-v1-activity" },
        "meta:forSnapshot": { "@id": "#meta-flow-v1-snapshot" },
        "prov:wasAttributedTo": attributedTo,
        "meta:delegationChain": delegationChain
      },
      {
        "@id": "#meta-flow-v1-snapshot",
        "@type": "flow:VersionSnapshot",
        "dcterms:title": `${title} Metadata Snapshot`,
        "dcterms:description": `Initial metadata snapshot for the ${slug} node.`,
        "dcterms:created": new Date().toISOString(),
        "prov:wasGeneratedBy": { "@id": "#meta-flow-v1-activity" },
        "dcat:distribution": {
          "@id": "#meta-flow-v1-distribution",
          "@type": "dcat:Distribution",
          "dcterms:format": "application/ld+json",
          "dcterms:title": `${title} Metadata Distribution`,
          "dcat:downloadURL": snapshotFileName
        }
      }
    ]
  };
}
