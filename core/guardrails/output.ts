import Ajv from 'ajv';
import schema from '../../schemas/output.schema.json';

const ajv = new Ajv({ allErrors: true, strict: false });

export class OutputGuardrails {
  private validateSchema = ajv.compile(schema);

  constructor(private maxChars = 20_000) {}

  validate(output: unknown) {
    const s = typeof output === 'string' ? output : JSON.stringify(output);
    if (s.length > this.maxChars) throw new Error('output too long');

    try {
      const parsed = JSON.parse(s);
      if (!this.validateSchema(parsed)) {
        const msg = this.validateSchema.errors
          ?.map(e => `${e.instancePath} ${e.message}`)
          .join('; ');
        throw new Error(`schema fail: ${msg}`);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('invalid JSON');
      }
      throw e;
    }

    return true;
  }
}
