import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { logger } from '../utils/logger.ts';
import { MESH } from '../../../flow-core/src/mesh-constants.ts';
import { join, basename } from 'jsr:@std/path';
import { ServiceConfigAccessor } from '../config/index.ts';
import { loadNodeConfig } from '../config/loaders/jsonld-loader.ts';
//import { Context } from '@hono/hono';

const initializeMeshRegistry = (config: ServiceConfigAccessor, meshRegistry: Record<string, string>) => {
  const meshPaths = config.meshPaths;
  if (meshPaths && Array.isArray(meshPaths)) {
    for (const meshPath of meshPaths) {
      const meshName = basename(meshPath);

      if (meshRegistry[meshName]) {
        logger.warn(`Mesh name collision detected: '${meshName}' already exists at path '${meshRegistry[meshName]}'. Skipping '${meshPath}'.`);
        continue;
      }

      meshRegistry[meshName] = meshPath;
      logger.info(`Discovered mesh '${meshName}' from configuration at path: ${meshPath}`);
    }
  }
};

export const createMeshesRoutes = (config: ServiceConfigAccessor): OpenAPIHono => {
  const meshes = new OpenAPIHono();
  const meshRegistry: Record<string, string> = {};
  initializeMeshRegistry(config, meshRegistry);

  // Schemas for Mesh Registration (POST /api/meshes)
  const MeshRegistrationRequest = z.object({
    name: z.string().openapi({
      description: 'The logical name for the mesh.',
      example: 'test-ns',
    }),
    path: z.string().openapi({
      description: 'The file system path to the mesh repository.',
      example: './test-ns',
    }),
  });

  const LinkObject = z.object({
    rel: z.string(),
    href: z.string(),
    method: z.string().optional(),
    title: z.string().optional(),
  });

  const MeshRegistrationResponse = z.object({
    message: z.string(),
    links: z.array(LinkObject),
  });

  // Schemas for Node Creation (POST /api/meshes/{meshName}/nodes)
  const NodeCreationRequest = z.object({
    path: z.string().openapi({
      description: "The relative path for the new node. For a root node, use `/` or an empty string; the API will return `/{meshName}/` as its path.",
      example: '/',
    }),
    nodeType: z.enum(['Namespace', 'Reference', 'Dataset']).openapi({
      description: 'The type of node to create.',
    }),
    initialData: z.record(z.string(), z.unknown()).openapi({
      description: 'An object containing the initial metadata for the node.',
      example: { title: "djradon's primary semantic mesh" },
    }),
    options: z.object({
      copyDefaultAssets: z.boolean().optional().openapi({
        description: 'If true, copies default assets (templates, CSS) into the mesh. Typically used for root node creation.',
      }),
    }).optional(),
  });

  const NodeCreationResponse = z.object({
    message: z.string(),
    nodePath: z.string(),
    filesCreated: z.array(z.string()),
    links: z.array(LinkObject),
  });

  const ErrorResponse = z.object({
    error: z.string(),
    message: z.string(),
  });

  // Route for Mesh Registration
  const registerMeshRoute = createRoute({
    method: 'post',
    path: '/meshes',
    tags: ['Mesh Management'],
    summary: 'Register a new mesh',
    request: {
      body: {
        content: {
          'application/json': {
            schema: MeshRegistrationRequest,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Mesh registered successfully.',
        content: {
          'application/json': {
            schema: MeshRegistrationResponse,
          },
        },
      },
      400: {
        description: 'Bad request due to invalid input or mesh already exists.',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
      404: {
        description: 'The specified path to the mesh does not exist.',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
    },
  });

  meshes.openapi(registerMeshRoute, async (c) => {
    const { name, path } = c.req.valid('json');

    if (meshRegistry[name]) {
      return c.json({
        error: 'Bad Request',
        message: `Mesh '${name}' is already registered at path: ${meshRegistry[name]}`,
      }, 400);
    }

    logger.info(`Attempting to register mesh '${name}' at path: ${path}`);

    try {
      const stats = await Deno.stat(path);
      if (!stats.isDirectory) {
        // Return a 400 error for validation issues, consistent with other checks
        return c.json({
          error: 'Bad Request',
          message: `Path '${path}' is not a directory.`,
        }, 400);
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return c.json({
          error: 'Not Found',
          message: `Path '${path}' does not exist.`,
        }, 404);
      }
      throw error; // Re-throw other errors for the global handler
    }

    const handlePath = join(path, MESH.HANDLE_DIR);
    const metaFlowPath = join(path, MESH.META_FLOW_DIR);
    let meshSignatureFound = false;

    try {
      await Deno.stat(handlePath);
      meshSignatureFound = true;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }

    if (!meshSignatureFound) {
      try {
        await Deno.stat(metaFlowPath);
        meshSignatureFound = true;
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
      }
    }

    const links: (z.infer<typeof LinkObject>)[] = [
      { rel: 'self', href: `/api/meshes/${name}` },
      { rel: 'nodes', href: `/api/meshes/${name}/nodes` },
    ];

    let message = `Mesh '${name}' registered successfully.`;
    if (!meshSignatureFound) {
      message += ' No mesh signature detected.';
      links.push({
        rel: 'create-root-node',
        href: `/api/meshes/${name}/nodes`,
        method: 'POST',
        title: 'Initialize this mesh by creating a root node',
      });
    }

    // Update registry after all validations pass
    meshRegistry[name] = path;

    return c.json({ message, links }, 201);
  });

  // Route for Node Creation
  const createNodeRoute = createRoute({
    method: 'post',
    path: '/meshes/{meshName}/nodes',
    tags: ['Node Management'],
    summary: 'Create a new node in a mesh',
    request: {
      params: z.object({
        meshName: z.string().openapi({
          description: 'The logical name of the mesh.',
          example: 'test-ns',
        }),
      }),
      body: {
        content: {
          'application/json': {
            schema: NodeCreationRequest,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Node created successfully.',
        content: {
          'application/json': {
            schema: NodeCreationResponse,
          },
        },
      },
      404: {
        description: 'Mesh not found.',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
    },
  });

  meshes.openapi(createNodeRoute, async (c) => {
    const { meshName } = c.req.param();
    const { path, nodeType, initialData, options } = c.req.valid('json');

    const meshRootPath = meshRegistry[meshName];
    if (!meshRootPath) {
      return c.json({
        error: "Not Found",
        message: `Mesh '${meshName}' not found.`
      }, 404);
    }

    const isRootNode = path === '/' || path === '';
    const responsePath = isRootNode ? `/${meshName}/` : path;
    const physicalPath = isRootNode ? meshRootPath : join(meshRootPath, path);

    logger.info(`Attempting to create node in mesh '${meshName}' at path '${path}' (physical: ${physicalPath})`);

    // This is a simplified implementation for now
    // It does not yet handle different node types or initialData
    const filesCreated: string[] = [];
    const slug = basename(path.replace(/\/$/, '')) || basename(meshRootPath);
    const snapshotFileName = 'meta-flow.jsonld';

    const handleDir = join(physicalPath, MESH.HANDLE_DIR);
    const metaFlowDir = join(physicalPath, MESH.META_FLOW_DIR, MESH.NEXT_SNAPSHOT_DIR);
    const snapshotFilePath = join(metaFlowDir, snapshotFileName);

    await Deno.mkdir(handleDir, { recursive: true });
    filesCreated.push(handleDir);

    await Deno.mkdir(metaFlowDir, { recursive: true });
    filesCreated.push(metaFlowDir);
    // Load node-specific configuration to check for attribution override
    let nodeConfig;
    try {
      nodeConfig = await loadNodeConfig(physicalPath);
    } catch (error) {
      if (error instanceof Error) {
        logger.warn(`Failed to load node config from ${physicalPath}: ${error.message}`);
      } else {
        logger.warn(`Failed to load node config from ${physicalPath}: ${String(error)}`);
      }
    }
    const attributedTo = nodeConfig?.['conf:defaultAttribution']
      ? { "@id": nodeConfig['conf:defaultAttribution'] }
      : config.defaultAttributedTo;

    const title = typeof initialData.title === 'string' ? initialData.title : 'N/A';
    const description = typeof initialData.description === 'string' ? initialData.description : `Node created for ${slug}`;

    const snapshotContent = {
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
          "@id": "#creation-activity",
          "@type": "meta:NodeCreation",
          "dcterms:title": `${title} Node Creation`,
          "dcterms:description": `Creation of the ${slug} ${nodeType} node.`,
          "prov:startedAtTime": new Date().toISOString(),
          "prov:endedAtTime": new Date().toISOString(),
          "prov:wasAssociatedWith": attributedTo
        },
        {
          "@id": "#meta-flow-v1-context",
          "@type": "meta:ProvenanceContext",
          "meta:forActivity": { "@id": "#meta-flow-v1-activity" },
          "meta:forSnapshot": { "@id": "#meta-flow-v1-snapshot" },
          "prov:wasAttributedTo": attributedTo,
          "meta:delegationChain": config.defaultDelegationChain
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

    await Deno.writeTextFile(snapshotFilePath, JSON.stringify(snapshotContent, null, 2));
    filesCreated.push(snapshotFilePath);

    if (options?.copyDefaultAssets) {
      const assetsDir = join(physicalPath, MESH.ASSETS_DIR);
      await Deno.mkdir(assetsDir, { recursive: true });
      filesCreated.push(assetsDir);
    }

    const response = {
      message: `Node created successfully at path '${responsePath}' in mesh '${meshName}'.`,
      nodePath: responsePath,
      filesCreated,
      links: [
        { rel: 'self', href: `/api/meshes/${meshName}/nodes${responsePath}` },
        { rel: 'mesh', href: `/api/meshes/${meshName}` },
      ],
    };

    return c.json(response, 201);
  });

  return meshes;
};
