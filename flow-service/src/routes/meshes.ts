import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { logger } from '../utils/logger.ts'
import { FlowServiceError, ValidationError } from '../utils/errors.ts'
import { MESH_CONSTANTS } from '../../../flow-core/src/mesh-constants.ts'
import { join } from 'jsr:@std/path'

const meshes = new OpenAPIHono()

const meshRegistry: Record<string, string> = {};

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
})

const LinkObject = z.object({
  rel: z.string(),
  href: z.string(),
  method: z.string().optional(),
  title: z.string().optional(),
})

const MeshRegistrationResponse = z.object({
  message: z.string(),
  links: z.array(LinkObject),
})

// Schemas for Node Creation (POST /api/meshes/{meshName}/nodes)
const NodeCreationRequest = z.object({
  path: z.string().openapi({
    description: "The relative path for the new node. For the root node, use `/` or an empty string. The API will return `/{meshName}/` as its path.",
    example: '/',
  }),
  nodeType: z.enum(['Namespace', 'Reference', 'Dataset']).openapi({
    description: 'The type of node to create.',
  }),
  initialData: z.record(z.unknown()).openapi({
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


// Route definitions will go here

export { meshes }

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
  },
});

meshes.openapi(registerMeshRoute, async (c) => {
  const { name, path } = c.req.valid('json');
  meshRegistry[name] = path;
  logger.info(`Attempting to register mesh '${name}' at path: ${path}`);

  try {
    const stats = await Deno.stat(path);
    if (!stats.isDirectory) {
      throw new ValidationError(`Path '${path}' is not a directory.`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new ValidationError(`Path '${path}' does not exist.`);
    }
    throw error;
  }

  const handlePath = join(path, MESH_CONSTANTS.HANDLE_DIR);
  const metaFlowPath = join(path, MESH_CONSTANTS.META_FLOW_DIR);
  let meshSignatureFound = false;

  try {
    await Deno.stat(handlePath);
    meshSignatureFound = true;
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  if (!meshSignatureFound) {
    try {
      await Deno.stat(metaFlowPath);
      meshSignatureFound = true;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
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

  const response = { message, links };

  return c.json(response, 201);
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
  },
});

meshes.openapi(createNodeRoute, async (c) => {
  const { meshName } = c.req.param();
  const { path, nodeType, initialData, options } = c.req.valid('json');

  const meshRootPath = meshRegistry[meshName];
  if (!meshRootPath) {
    throw new ValidationError(`Mesh '${meshName}' not found.`);
  }

  const isRootNode = path === '/' || path === '';
  const responsePath = isRootNode ? `/${meshName}/` : path;
  const physicalPath = isRootNode ? meshRootPath : join(meshRootPath, path);

  logger.info(`Attempting to create node in mesh '${meshName}' at path '${path}' (physical: ${physicalPath})`);

  // This is a simplified implementation for now
  // It does not yet handle different node types or initialData
  const filesCreated: string[] = [];

  const handleDir = join(physicalPath, MESH_CONSTANTS.HANDLE_DIR);
  const metaFlowDir = join(physicalPath, MESH_CONSTANTS.META_FLOW_DIR);

  await Deno.mkdir(handleDir, { recursive: true });
  filesCreated.push(handleDir);

  await Deno.mkdir(metaFlowDir, { recursive: true });
  filesCreated.push(metaFlowDir);

  if (options?.copyDefaultAssets) {
    const assetsDir = join(physicalPath, MESH_CONSTANTS.ASSETS_COMPONENT_DIR);
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
