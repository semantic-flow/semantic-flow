import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { logger } from '../utils/logger.ts';
import { getMetaFlowPath, getNextMetaDistPath, getCurrentMetaDistPath, MESH, getHandlePath, getAssetsPath } from '../../../flow-core/src/mesh-constants.ts';
import { join, basename, dirname } from 'jsr:@std/path';
import { ServiceConfigAccessor } from '../config/index.ts';
import { composeMetadataContent } from '../services/metadata-composer.ts';
import { initializeMeshRegistry } from '../utils/mesh-utils.ts';

//import { Context } from '@hono/hono';

export const createMeshesRoutes = (config: ServiceConfigAccessor): OpenAPIHono => {
  const meshes = new OpenAPIHono();
  const meshRegistry: Record<string, string> = {};
  initializeMeshRegistry(config, meshRegistry);

  // Schemas for Mesh Registration (POST /api/meshes)
  const MeshRegistrationRequest = z.object({
    name: z.string().openapi({
      description: 'The logical name for the mesh.',
      example: 'ns',
    }),
    parentPath: z.string().openapi({
      description: "The file system path to the mesh's parent directory.",
      example: '../meshes',
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
    apiNodePath: z.string().openapi({
      description: "The relative path for the new node, using '~' as a separator. For a root node, use an empty string.",
      examples: [
        '',
        'djradon',
        'djradon~underbrush'
      ],
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
    summary: 'Register an existing mesh',
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
    const { name, parentPath } = c.req.valid('json');
    const path = join(parentPath, name);

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
    meshRegistry[name] = parentPath;

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
      409: {
        description: 'Node already exists.',
        content: {
          'application/json': {
            schema: ErrorResponse,
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
    const { apiNodePath, nodeType, initialData, options } = c.req.valid('json');
    const fileSystemNodePath = apiNodePath.replace(/~/g, '/');

    const meshParentPath = meshRegistry[meshName];
    if (!meshParentPath) {
      return c.json({
        error: "Not Found",
        message: `Mesh '${meshName}' not found.`
      }, 404);
    }

    const isRootNode = apiNodePath === '' || apiNodePath === '~';
    const responsePath = isRootNode ? `/${meshName}/` : fileSystemNodePath;

    const logMessage = isRootNode
      ? `Attempting to create node at mesh root (${meshName})`
      : `Attempting to create node in mesh '${meshName}' at path '${fileSystemNodePath}' (physical: ${meshParentPath})`;
    logger.info(logMessage);

    const slug = apiNodePath.split(MESH.API_IDENTIFIER_PATH_SEPARATOR).pop() || meshName;

    // Check for node existence - fail if either _handle or _meta-flow directories exist
    const handleDir = join(meshParentPath, getHandlePath(slug));
    const metaFlowDir = join(meshParentPath, getMetaFlowPath(slug));

    let nodeExists = false;
    try {
      await Deno.stat(handleDir);
      nodeExists = true;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }

    if (!nodeExists) {
      try {
        await Deno.stat(metaFlowDir);
        nodeExists = true;
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
      }
    }

    if (nodeExists) {
      return c.json({
        error: 'Conflict',
        message: `Node already exists at path '${responsePath}' in mesh '${meshName}'.`
      }, 409);
    }

    // This is a simplified implementation for now
    // It does not yet handle different node types or initialData
    const filesCreated: string[] = [];
    const assetsDir = join(meshParentPath, getAssetsPath(slug));
    const currentMetaDistPath = join(meshParentPath, getCurrentMetaDistPath(slug));
    const nextMetaDistPath = join(meshParentPath, getNextMetaDistPath(slug));

    await Deno.mkdir(handleDir, { recursive: true });
    filesCreated.push(handleDir);

    await Deno.mkdir(metaFlowDir, { recursive: true });
    filesCreated.push(metaFlowDir);

    const metadataContent = composeMetadataContent(
      slug,
      nodeType,
      initialData,
      config
    );

    await Deno.mkdir(dirname(currentMetaDistPath), { recursive: true });
    await Deno.writeTextFile(currentMetaDistPath, JSON.stringify(metadataContent, null, 2));
    filesCreated.push(currentMetaDistPath);

    await Deno.mkdir(dirname(nextMetaDistPath), { recursive: true });
    await Deno.writeTextFile(nextMetaDistPath, JSON.stringify(metadataContent, null, 2));
    filesCreated.push(nextMetaDistPath);

    if (options?.copyDefaultAssets) {
      await Deno.mkdir(assetsDir, { recursive: true });
      filesCreated.push(assetsDir);
    }

    const message = isRootNode
      ? `Node created successfully at mesh root (${meshName})`
      : `Node created successfully at path '${fileSystemNodePath}' in mesh '${meshName}'.`;

    const links: (z.infer<typeof LinkObject>)[] = [
      { rel: 'self', href: `/api/meshes/${meshName}/nodes${responsePath}` },
      { rel: 'mesh', href: `/api/meshes/${meshName}` },
    ];

    const response = {
      message,
      nodePath: responsePath,
      filesCreated,
      links,
    };

    return c.json(response, 201);
  });

  return meshes;
};
