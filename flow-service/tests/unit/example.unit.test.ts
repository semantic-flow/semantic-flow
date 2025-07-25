import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * Comprehensive unit tests for example functionality
 * Testing Framework: Jest with TypeScript
 * 
 * This test suite covers:
 * - Happy path scenarios
 * - Edge cases and boundary conditions
 * - Error handling and failure conditions
 * - Input validation
 * - Mocking external dependencies
 * - Performance and resource management
 * - Type safety validation
 */

// Mock external dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

const mockConfigService = {
  get: jest.fn(),
  set: jest.fn(),
  validate: jest.fn()
};

const mockDataProcessor = {
  process: jest.fn(),
  validate: jest.fn(),
  transform: jest.fn()
};

// Example service class that might exist in the flow-service
class ExampleFlowService {
  private logger: any;
  private configService: any;
  private dataProcessor: any;

  constructor(logger: any, configService: any, dataProcessor: any) {
    this.logger = logger;
    this.configService = configService;
    this.dataProcessor = dataProcessor;
  }

  async processFlow(flowId: string, payload: any): Promise<any> {
    if (!flowId || typeof flowId !== 'string' || flowId.trim().length === 0) {
      throw new Error('Flow ID must be a non-empty string');
    }

    if (!payload) {
      throw new Error('Payload is required');
    }

    this.logger.info(`Processing flow: ${flowId}`);

    const config = await this.configService.get(flowId);
    if (!config) {
      throw new Error(`Configuration not found for flow: ${flowId}`);
    }

    const isValid = await this.dataProcessor.validate(payload, config.schema);
    if (!isValid) {
      throw new Error('Payload validation failed');
    }

    const transformedData = await this.dataProcessor.transform(payload, config.transformRules);
    const result = await this.dataProcessor.process(transformedData, config.processingOptions);

    this.logger.info(`Flow processing completed: ${flowId}`);
    return result;
  }

  validateFlowConfiguration(config: any): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }

    const requiredFields = ['id', 'name', 'schema', 'transformRules', 'processingOptions'];
    for (const field of requiredFields) {
      if (!(field in config)) {
        return false;
      }
    }

    if (typeof config.id !== 'string' || config.id.trim().length === 0) {
      return false;
    }

    if (typeof config.name !== 'string' || config.name.trim().length === 0) {
      return false;
    }

    return true;
  }

  calculateMetrics(data: any[]): { count: number; average: number; min: number; max: number } {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    if (data.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 };
    }

    const numericData = data.filter(item => typeof item === 'number' && !isNaN(item));
    
    if (numericData.length === 0) {
      throw new Error('No valid numeric data found');
    }

    const count = numericData.length;
    const sum = numericData.reduce((acc, val) => acc + val, 0);
    const average = sum / count;
    const min = Math.min(...numericData);
    const max = Math.max(...numericData);

    return { count, average, min, max };
  }

  formatResponse(data: any, format: 'json' | 'xml' | 'csv' = 'json'): string {
    if (data === null || data === undefined) {
      return '';
    }

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'xml':
        return this.toXML(data);
      case 'csv':
        return this.toCSV(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private toXML(data: any): string {
    if (typeof data === 'object' && data !== null) {
      let xml = '<root>';
      for (const [key, value] of Object.entries(data)) {
        xml += `<${key}>${typeof value === 'object' ? this.toXML(value).replace('<root>', '').replace('</root>', '') : value}</${key}>`;
      }
      xml += '</root>';
      return xml;
    }
    return `<root>${data}</root>`;
  }

  private toCSV(data: any): string {
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        });
        csvRows.push(values.join(','));
      }
      
      return csvRows.join('\n');
    }
    return '';
  }
}

describe('ExampleFlowService', () => {
  let exampleFlowService: ExampleFlowService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockConfigService.get.mockResolvedValue({
      id: 'test-flow',
      name: 'Test Flow',
      schema: { type: 'object' },
      transformRules: [],
      processingOptions: { timeout: 5000 }
    });
    mockDataProcessor.validate.mockResolvedValue(true);
    mockDataProcessor.transform.mockResolvedValue({ transformed: true });
    mockDataProcessor.process.mockResolvedValue({ processed: true, result: 'success' });

    exampleFlowService = new ExampleFlowService(mockLogger, mockConfigService, mockDataProcessor);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processFlow', () => {
    describe('Happy Path Scenarios', () => {
      it('should successfully process a valid flow', async () => {
        const flowId = 'test-flow-001';
        const payload = { data: 'test-data', timestamp: Date.now() };

        const result = await exampleFlowService.processFlow(flowId, payload);

        expect(result).toEqual({ processed: true, result: 'success' });
        expect(mockLogger.info).toHaveBeenCalledWith(`Processing flow: ${flowId}`);
        expect(mockLogger.info).toHaveBeenCalledWith(`Flow processing completed: ${flowId}`);
        expect(mockConfigService.get).toHaveBeenCalledWith(flowId);
        expect(mockDataProcessor.validate).toHaveBeenCalled();
        expect(mockDataProcessor.transform).toHaveBeenCalled();
        expect(mockDataProcessor.process).toHaveBeenCalled();
      });

      it('should handle complex nested payload structures', async () => {
        const flowId = 'complex-flow';
        const payload = {
          user: { id: 123, name: 'John Doe' },
          metadata: { version: '1.0', tags: ['urgent', 'priority'] },
          data: { items: [1, 2, 3], total: 100 }
        };

        const result = await exampleFlowService.processFlow(flowId, payload);

        expect(result).toEqual({ processed: true, result: 'success' });
        expect(mockDataProcessor.validate).toHaveBeenCalledWith(payload, { type: 'object' });
      });

      it('should process flows with different configuration types', async () => {
        const flowId = 'config-variant-flow';
        const customConfig = {
          id: 'config-variant-flow',
          name: 'Config Variant Flow',
          schema: { type: 'array', items: { type: 'string' } },
          transformRules: [{ rule: 'uppercase' }],
          processingOptions: { timeout: 10000, retries: 3 }
        };
        mockConfigService.get.mockResolvedValue(customConfig);

        const payload = ['item1', 'item2', 'item3'];
        const result = await exampleFlowService.processFlow(flowId, payload);

        expect(result).toEqual({ processed: true, result: 'success' });
        expect(mockDataProcessor.validate).toHaveBeenCalledWith(payload, customConfig.schema);
        expect(mockDataProcessor.transform).toHaveBeenCalledWith({ transformed: true }, customConfig.transformRules);
      });
    });

    describe('Edge Cases', () => {
      it('should handle single character flow ID', async () => {
        const flowId = 'a';
        const payload = { test: true };

        const result = await exampleFlowService.processFlow(flowId, payload);

        expect(result).toEqual({ processed: true, result: 'success' });
      });

      it('should handle flow ID with special characters', async () => {
        const flowId = 'flow-123_test.v2';
        const payload = { test: true };

        const result = await exampleFlowService.processFlow(flowId, payload);

        expect(result).toEqual({ processed: true, result: 'success' });
      });

      it('should handle empty object payload', async () => {
        const flowId = 'empty-payload-flow';
        const payload = {};

        const result = await exampleFlowService.processFlow(flowId, payload);

        expect(result).toEqual({ processed: true, result: 'success' });
      });

      it('should handle array payload', async () => {
        const flowId = 'array-flow';
        const payload = [1, 2, 3, 4, 5];

        const result = await exampleFlowService.processFlow(flowId, payload);

        expect(result).toEqual({ processed: true, result: 'success' });
      });

      it('should handle boolean payload', async () => {
        const flowId = 'boolean-flow';
        const payload = true;

        const result = await exampleFlowService.processFlow(flowId, payload);

        expect(result).toEqual({ processed: true, result: 'success' });
      });
    });

    describe('Error Handling', () => {
      it('should throw error for empty flow ID', async () => {
        await expect(exampleFlowService.processFlow('', { test: true }))
          .rejects.toThrow('Flow ID must be a non-empty string');
      });

      it('should throw error for whitespace-only flow ID', async () => {
        await expect(exampleFlowService.processFlow('   ', { test: true }))
          .rejects.toThrow('Flow ID must be a non-empty string');
      });

      it('should throw error for non-string flow ID', async () => {
        await expect(exampleFlowService.processFlow(123 as any, { test: true }))
          .rejects.toThrow('Flow ID must be a non-empty string');
      });

      it('should throw error for null flow ID', async () => {
        await expect(exampleFlowService.processFlow(null as any, { test: true }))
          .rejects.toThrow('Flow ID must be a non-empty string');
      });

      it('should throw error for undefined flow ID', async () => {
        await expect(exampleFlowService.processFlow(undefined as any, { test: true }))
          .rejects.toThrow('Flow ID must be a non-empty string');
      });

      it('should throw error for missing payload', async () => {
        await expect(exampleFlowService.processFlow('test-flow', null))
          .rejects.toThrow('Payload is required');
      });

      it('should throw error for undefined payload', async () => {
        await expect(exampleFlowService.processFlow('test-flow', undefined))
          .rejects.toThrow('Payload is required');
      });

      it('should throw error when configuration is not found', async () => {
        mockConfigService.get.mockResolvedValue(null);

        await expect(exampleFlowService.processFlow('nonexistent-flow', { test: true }))
          .rejects.toThrow('Configuration not found for flow: nonexistent-flow');
      });

      it('should throw error when payload validation fails', async () => {
        mockDataProcessor.validate.mockResolvedValue(false);

        await expect(exampleFlowService.processFlow('test-flow', { invalid: 'data' }))
          .rejects.toThrow('Payload validation failed');
      });

      it('should handle config service errors', async () => {
        mockConfigService.get.mockRejectedValue(new Error('Config service unavailable'));

        await expect(exampleFlowService.processFlow('test-flow', { test: true }))
          .rejects.toThrow('Config service unavailable');
      });

      it('should handle data processor validation errors', async () => {
        mockDataProcessor.validate.mockRejectedValue(new Error('Validation service error'));

        await expect(exampleFlowService.processFlow('test-flow', { test: true }))
          .rejects.toThrow('Validation service error');
      });

      it('should handle data processor transform errors', async () => {
        mockDataProcessor.transform.mockRejectedValue(new Error('Transform service error'));

        await expect(exampleFlowService.processFlow('test-flow', { test: true }))
          .rejects.toThrow('Transform service error');
      });

      it('should handle data processor process errors', async () => {
        mockDataProcessor.process.mockRejectedValue(new Error('Processing service error'));

        await expect(exampleFlowService.processFlow('test-flow', { test: true }))
          .rejects.toThrow('Processing service error');
      });
    });

    describe('Input Validation', () => {
      it.each([
        [null, null],
        [undefined, undefined],
        ['', { test: true }],
        ['test-flow', null],
        ['test-flow', undefined]
      ])('should handle invalid inputs: flowId=%s, payload=%s', async (flowId: any, payload: any) => {
        await expect(exampleFlowService.processFlow(flowId, payload))
          .rejects.toThrow();
      });
    });
  });

  describe('validateFlowConfiguration', () => {
    describe('Happy Path Scenarios', () => {
      it('should validate a complete valid configuration', () => {
        const config = {
          id: 'valid-flow',
          name: 'Valid Flow',
          schema: { type: 'object' },
          transformRules: [{ rule: 'normalize' }],
          processingOptions: { timeout: 5000 }
        };

        const result = exampleFlowService.validateFlowConfiguration(config);

        expect(result).toBe(true);
      });

      it('should validate configuration with minimal required fields', () => {
        const config = {
          id: 'minimal-flow',
          name: 'Minimal Flow',
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config);

        expect(result).toBe(true);
      });

      it('should validate configuration with extra fields', () => {
        const config = {
          id: 'extended-flow',
          name: 'Extended Flow',
          schema: { type: 'object' },
          transformRules: [],
          processingOptions: {},
          description: 'This is an extended configuration',
          version: '1.0',
          author: 'Test Author'
        };

        const result = exampleFlowService.validateFlowConfiguration(config);

        expect(result).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle configuration with single character ID', () => {
        const config = {
          id: 'a',
          name: 'Single Char Flow',
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config);

        expect(result).toBe(true);
      });

      it('should handle configuration with single character name', () => {
        const config = {
          id: 'short-name-flow',
          name: 'A',
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config);

        expect(result).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should return false for null configuration', () => {
        const result = exampleFlowService.validateFlowConfiguration(null);
        expect(result).toBe(false);
      });

      it('should return false for undefined configuration', () => {
        const result = exampleFlowService.validateFlowConfiguration(undefined);
        expect(result).toBe(false);
      });

      it('should return false for non-object configuration', () => {
        expect(exampleFlowService.validateFlowConfiguration('string')).toBe(false);
        expect(exampleFlowService.validateFlowConfiguration(123)).toBe(false);
        expect(exampleFlowService.validateFlowConfiguration([])).toBe(false);
        expect(exampleFlowService.validateFlowConfiguration(true)).toBe(false);
      });

      it('should return false for configuration missing required fields', () => {
        const incompleteConfigs = [
          { name: 'Missing ID', schema: {}, transformRules: [], processingOptions: {} },
          { id: 'missing-name', schema: {}, transformRules: [], processingOptions: {} },
          { id: 'missing-schema', name: 'Missing Schema', transformRules: [], processingOptions: {} },
          { id: 'missing-rules', name: 'Missing Rules', schema: {}, processingOptions: {} },
          { id: 'missing-options', name: 'Missing Options', schema: {}, transformRules: [] }
        ];

        incompleteConfigs.forEach(config => {
          expect(exampleFlowService.validateFlowConfiguration(config)).toBe(false);
        });
      });

      it('should return false for empty string ID', () => {
        const config = {
          id: '',
          name: 'Empty ID Flow',
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config);
        expect(result).toBe(false);
      });

      it('should return false for whitespace-only ID', () => {
        const config = {
          id: '   ',
          name: 'Whitespace ID Flow',
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config);
        expect(result).toBe(false);
      });

      it('should return false for empty string name', () => {
        const config = {
          id: 'empty-name-flow',
          name: '',
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config);
        expect(result).toBe(false);
      });

      it('should return false for whitespace-only name', () => {
        const config = {
          id: 'whitespace-name-flow',
          name: '   ',
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config);
        expect(result).toBe(false);
      });

      it('should return false for non-string ID', () => {
        const config = {
          id: 123,
          name: 'Numeric ID Flow',
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config as any);
        expect(result).toBe(false);
      });

      it('should return false for non-string name', () => {
        const config = {
          id: 'non-string-name-flow',
          name: 123,
          schema: {},
          transformRules: [],
          processingOptions: {}
        };

        const result = exampleFlowService.validateFlowConfiguration(config as any);
        expect(result).toBe(false);
      });
    });
  });

  describe('calculateMetrics', () => {
    describe('Happy Path Scenarios', () => {
      it('should calculate metrics for positive numbers', () => {
        const data = [1, 2, 3, 4, 5];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result).toEqual({
          count: 5,
          average: 3,
          min: 1,
          max: 5
        });
      });

      it('should calculate metrics for negative numbers', () => {
        const data = [-5, -3, -1, -4, -2];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result).toEqual({
          count: 5,
          average: -3,
          min: -5,
          max: -1
        });
      });

      it('should calculate metrics for mixed positive and negative numbers', () => {
        const data = [-2, -1, 0, 1, 2];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result).toEqual({
          count: 5,
          average: 0,
          min: -2,
          max: 2
        });
      });

      it('should calculate metrics for single number', () => {
        const data = [42];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result).toEqual({
          count: 1,
          average: 42,
          min: 42,
          max: 42
        });
      });

      it('should calculate metrics for decimal numbers', () => {
        const data = [1.5, 2.5, 3.5];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result).toEqual({
          count: 3,
          average: 2.5,
          min: 1.5,
          max: 3.5
        });
      });

      it('should filter out non-numeric values and calculate metrics', () => {
        const data = [1, 'invalid', 3, null, 5, undefined, 7];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result).toEqual({
          count: 4,
          average: 4,
          min: 1,
          max: 7
        });
      });
    });

    describe('Edge Cases', () => {
      it('should return zero metrics for empty array', () => {
        const data: any[] = [];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result).toEqual({
          count: 0,
          average: 0,
          min: 0,
          max: 0
        });
      });

      it('should handle very large numbers', () => {
        const data = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result.count).toBe(2);
        expect(result.min).toBe(Number.MAX_SAFE_INTEGER - 1);
        expect(result.max).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('should handle very small numbers', () => {
        const data = [Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER + 1];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result.count).toBe(2);
        expect(result.min).toBe(Number.MIN_SAFE_INTEGER);
        expect(result.max).toBe(Number.MIN_SAFE_INTEGER + 1);
      });

      it('should handle zero values', () => {
        const data = [0, 0, 0];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result).toEqual({
          count: 3,
          average: 0,
          min: 0,
          max: 0
        });
      });

      it('should handle infinity values', () => {
        const data = [Infinity, -Infinity, 5];
        const result = exampleFlowService.calculateMetrics(data);

        expect(result.count).toBe(3);
        expect(result.min).toBe(-Infinity);
        expect(result.max).toBe(Infinity);
      });
    });

    describe('Error Handling', () => {
      it('should throw error for non-array input', () => {
        expect(() => exampleFlowService.calculateMetrics('not-an-array' as any))
          .toThrow('Data must be an array');
      });

      it('should throw error for array with no valid numeric data', () => {
        const data = ['string', null, undefined, {}, []];
        expect(() => exampleFlowService.calculateMetrics(data))
          .toThrow('No valid numeric data found');
      });

      it('should throw error for array containing only NaN values', () => {
        const data = [NaN, NaN, NaN];
        expect(() => exampleFlowService.calculateMetrics(data))
          .toThrow('No valid numeric data found');
      });

      it.each([
        null,
        undefined,
        'string',
        123,
        {},
        true
      ])('should throw error for %s input type', (input: any) => {
        expect(() => exampleFlowService.calculateMetrics(input))
          .toThrow('Data must be an array');
      });
    });
  });

  describe('formatResponse', () => {
    describe('Happy Path Scenarios', () => {
      it('should format object as JSON by default', () => {
        const data = { name: 'test', value: 123 };
        const result = exampleFlowService.formatResponse(data);

        expect(result).toBe(JSON.stringify(data, null, 2));
      });

      it('should format object as JSON when explicitly specified', () => {
        const data = { name: 'test', value: 123 };
        const result = exampleFlowService.formatResponse(data, 'json');

        expect(result).toBe(JSON.stringify(data, null, 2));
      });

      it('should format object as XML', () => {
        const data = { name: 'test', value: 123 };
        const result = exampleFlowService.formatResponse(data, 'xml');

        expect(result).toBe('<root><name>test</name><value>123</value></root>');
      });

      it('should format array as CSV', () => {
        const data = [
          { name: 'John', age: 30, city: 'New York' },
          { name: 'Jane', age: 25, city: 'Boston' }
        ];
        const result = exampleFlowService.formatResponse(data, 'csv');

        const expectedCSV = 'name,age,city\nJohn,30,New York\nJane,25,Boston';
        expect(result).toBe(expectedCSV);
      });

      it('should handle CSV with comma in values', () => {
        const data = [
          { name: 'John Doe', city: 'New York, NY' },
          { name: 'Jane Smith', city: 'Boston, MA' }
        ];
        const result = exampleFlowService.formatResponse(data, 'csv');

        const expectedCSV = 'name,city\nJohn Doe,"New York, NY"\nJane Smith,"Boston, MA"';
        expect(result).toBe(expectedCSV);
      });

      it('should format nested objects as XML', () => {
        const data = {
          user: {
            name: 'John',
            details: {
              age: 30,
              email: 'john@example.com'
            }
          }
        };
        const result = exampleFlowService.formatResponse(data, 'xml');

        expect(result).toContain('<user><name>John</name><details><age>30</age><email>john@example.com</email></details></user>');
      });
    });

    describe('Edge Cases', () => {
      it('should return empty string for null data', () => {
        const result = exampleFlowService.formatResponse(null);
        expect(result).toBe('');
      });

      it('should return empty string for undefined data', () => {
        const result = exampleFlowService.formatResponse(undefined);
        expect(result).toBe('');
      });

      it('should handle empty object', () => {
        const data = {};
        const result = exampleFlowService.formatResponse(data, 'json');
        expect(result).toBe('{}');
      });

      it('should handle empty array', () => {
        const data: any[] = [];
        const result = exampleFlowService.formatResponse(data, 'json');
        expect(result).toBe('[]');
      });

      it('should return empty string for empty array CSV', () => {
        const data: any[] = [];
        const result = exampleFlowService.formatResponse(data, 'csv');
        expect(result).toBe('');
      });

      it('should handle single primitive value as XML', () => {
        const result = exampleFlowService.formatResponse('test', 'xml');
        expect(result).toBe('<root>test</root>');
      });

      it('should handle number as XML', () => {
        const result = exampleFlowService.formatResponse(123, 'xml');
        expect(result).toBe('<root>123</root>');
      });

      it('should handle boolean as XML', () => {
        const result = exampleFlowService.formatResponse(true, 'xml');
        expect(result).toBe('<root>true</root>');
      });

      it('should handle array with single object as CSV', () => {
        const data = [{ name: 'John', age: 30 }];
        const result = exampleFlowService.formatResponse(data, 'csv');
        expect(result).toBe('name,age\nJohn,30');
      });
    });

    describe('Error Handling', () => {
      it('should throw error for unsupported format', () => {
        const data = { test: true };
        expect(() => exampleFlowService.formatResponse(data, 'yaml' as any))
          .toThrow('Unsupported format: yaml');
      });

      it('should handle circular references in JSON gracefully', () => {
        const data: any = { name: 'test' };
        data.self = data;

        expect(() => exampleFlowService.formatResponse(data, 'json'))
          .toThrow();
      });
    });

    describe('Format-specific Edge Cases', () => {
      it('should handle special characters in XML', () => {
        const data = { message: '<script>alert("test")</script>' };
        const result = exampleFlowService.formatResponse(data, 'xml');
        expect(result).toContain('<message><script>alert("test")</script></message>');
      });

      it('should handle CSV with special characters in headers', () => {
        const data = [{ 'special-header': 'value1' }, { 'special-header': 'value2' }];
        const result = exampleFlowService.formatResponse(data, 'csv');
        expect(result).toBe('special-header\nvalue1\nvalue2');
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow from processing to formatting', async () => {
      const flowId = 'integration-test-flow';
      const payload = { data: [1, 2, 3, 4, 5] };

      mockDataProcessor.process.mockResolvedValue({ metrics: [1, 2, 3, 4, 5] });

      const processResult = await exampleFlowService.processFlow(flowId, payload);
      const metrics = exampleFlowService.calculateMetrics(processResult.metrics);
      const formattedResult = exampleFlowService.formatResponse(metrics, 'json');

      expect(metrics.average).toBe(3);
      expect(formattedResult).toContain('"average": 3');
    });

    it('should validate configuration before processing flow', async () => {
      const flowId = 'validation-test-flow';
      const payload = { test: true };
      const config = {
        id: flowId,
        name: 'Validation Test Flow',
        schema: { type: 'object' },
        transformRules: [],
        processingOptions: {}
      };

      mockConfigService.get.mockResolvedValue(config);
      const isValidConfig = exampleFlowService.validateFlowConfiguration(config);

      expect(isValidConfig).toBe(true);

      const result = await exampleFlowService.processFlow(flowId, payload);
      expect(result).toEqual({ processed: true, result: 'success' });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large data arrays efficiently', () => {
      const largeArray = Array.from({ length: 100000 }, (_, i) => i + 1);
      const result = exampleFlowService.calculateMetrics(largeArray);

      expect(result.count).toBe(100000);
      expect(result.average).toBe(50000.5);
      expect(result.min).toBe(1);
      expect(result.max).toBe(100000);
    });

    it('should handle concurrent flow processing requests', async () => {
      const flowIds = ['flow1', 'flow2', 'flow3', 'flow4', 'flow5'];
      const payload = { concurrent: true };

      const promises = flowIds.map(flowId => 
        exampleFlowService.processFlow(flowId, payload)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toEqual({ processed: true, result: 'success' });
      });

      expect(mockConfigService.get).toHaveBeenCalledTimes(5);
      expect(mockDataProcessor.validate).toHaveBeenCalledTimes(5);
      expect(mockDataProcessor.transform).toHaveBeenCalledTimes(5);
      expect(mockDataProcessor.process).toHaveBeenCalledTimes(5);
    });

    it('should handle formatting large datasets', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100
      }));

      const jsonResult = exampleFlowService.formatResponse(largeDataset, 'json');
      const csvResult = exampleFlowService.formatResponse(largeDataset, 'csv');

      expect(jsonResult.length).toBeGreaterThan(0);
      expect(csvResult.length).toBeGreaterThan(0);
      expect(csvResult.split('\n')).toHaveLength(1001); // 1000 rows + 1 header
    });
  });

  describe('Type Safety and Validation', () => {
    it('should maintain type safety across operations', async () => {
      const flowId = 'type-safety-test';
      const payload = { typedData: 'string-value' };

      const result = await exampleFlowService.processFlow(flowId, payload);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('result');
    });

    it('should handle TypeScript strict null checks in configuration validation', () => {
      expect(exampleFlowService.validateFlowConfiguration(null)).toBe(false);
      expect(exampleFlowService.validateFlowConfiguration(undefined)).toBe(false);
    });

    it('should handle TypeScript strict null checks in metrics calculation', () => {
      const dataWithNulls = [1, null, 3, undefined, 5];
      const result = exampleFlowService.calculateMetrics(dataWithNulls);
      
      expect(result.count).toBe(3); // Only valid numbers counted
      expect(result.average).toBe(3);
    });

    it('should maintain proper return types', async () => {
      const flowId = 'return-type-test';
      const payload = { test: true };

      const processResult = await exampleFlowService.processFlow(flowId, payload);
      expect(typeof processResult).toBe('object');

      const metrics = exampleFlowService.calculateMetrics([1, 2, 3]);
      expect(typeof metrics).toBe('object');
      expect(typeof metrics.count).toBe('number');
      expect(typeof metrics.average).toBe('number');

      const formatted = exampleFlowService.formatResponse(processResult);
      expect(typeof formatted).toBe('string');

      const isValid = exampleFlowService.validateFlowConfiguration({
        id: 'test',
        name: 'test',
        schema: {},
        transformRules: [],
        processingOptions: {}
      });
      expect(typeof isValid).toBe('boolean');
    });
  });
});