import { getMetadataArgsStorage } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';

export const swaggerSpec = routingControllersToSpec(
  getMetadataArgsStorage(),
  {
    routePrefix: '/api',
  },
  {
    openapi: '3.0.0',
    info: {
      title: 'Caveo API',
      version: '1.0.0',
      description: 'API documentation for Caveo application with AWS Cognito authentication',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your ID Token from AWS Cognito',
        },
      },
      schemas: validationMetadatasToSchemas({
        refPointerPrefix: '#/components/schemas/',
      }),
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  }
);
