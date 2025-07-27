import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { logger } from '../utils/logger.ts';
import { MESH } from '../../../flow-core/src/mesh-constants.ts';
import { ServiceConfigAccessor } from '../config/index.ts';

// Utility function to validate node specifier using QName rules (simplified regex for example)
const isValidNodeSpecifier = (specifier: string): boolean => {
  // QName characters: letters, digits, underscore, hyphen, dot, and the separator "~"
  const qnameRegex = new RegExp(
    `^[\\w.-]+(${MESH.API_IDENTIFIER_PATH_SEPARATOR}[\\w.-]+)*$`,
  );
  return qnameRegex.test(specifier);
};

// Parse node specifier into segments
const parseNodeSpecifier = (specifier: string): string[] => {
  return specifier.split(MESH.API_IDENTIFIER_PATH_SEPARATOR);
};

export const createWeaveRoutes = (
  config: ServiceConfigAccessor,
): OpenAPIHono => {
  const weave = new OpenAPIHono();

  // Schema for the node specifier parameter
  const NodeSpecifierParam = z.object({
    nodeSpecifier: z.string().openapi({
      description:
        `The node specifier string using '${MESH.API_IDENTIFIER_PATH_SEPARATOR}' as separator, including root node.`,
      example:
        `test-ns${MESH.API_IDENTIFIER_PATH_SEPARATOR}djradon${MESH.API_IDENTIFIER_PATH_SEPARATOR}underbrush`,
    }),
  });

  // Route for triggering weave process on a single node
  const weaveNodeRoute = createRoute({
    method: 'post',
    path: '/weave/:nodeSpecifier',
    tags: ['Weave Process'],
    summary: 'Trigger the weave process for a specific node',
    request: {
      params: NodeSpecifierParam,
      // For now, no request body; can be extended later for interactive modes or options
    },
    responses: {
      200: {
        description: 'Weave process completed successfully.',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
              nodeSpecifier: z.string(),
            }),
          },
        },
      },
      400: {
        description: 'Invalid node specifier.',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
              message: z.string(),
            }),
          },
        },
      },
      500: {
        description: 'Internal server error during weave process.',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
              message: z.string(),
            }),
          },
        },
      },
    },
  });

  weave.openapi(weaveNodeRoute, (c) => {
    const { nodeSpecifier } = c.req.param();

    if (!isValidNodeSpecifier(nodeSpecifier)) {
      return c.json({
        error: 'Bad Request',
        message:
          `Invalid node specifier '${nodeSpecifier}'. Must use valid QName characters and '${MESH.API_IDENTIFIER_PATH_SEPARATOR}' as separator.`,
      }, 400);
    }

    const nodeSegments = parseNodeSpecifier(nodeSpecifier);
    logger.info(
      `Starting weave process for node specifier: ${nodeSpecifier} (segments: ${
        nodeSegments.join(', ')
      })`,
    );

    try {
      // TODO: Implement the actual weave process logic here
      // For now, simulate success response
      return c.json({
        message:
          `Weave process completed successfully for node '${nodeSpecifier}'.`,
        nodeSpecifier,
      }, 200);
    } catch (error) {
      logger.error(
        `Weave process failed for node '${nodeSpecifier}': ${String(error)}`,
      );
      return c.json({
        error: 'Internal Server Error',
        message: `Weave process failed for node '${nodeSpecifier}'.`,
      }, 500);
    }
  });

  return weave;
};
