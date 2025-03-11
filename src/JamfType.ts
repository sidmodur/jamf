import * as bson from "bson";
import { z } from 'zod';

export enum JamfFirstPartyTypeKind {
    ObjectID = 'ObjectID',
}

/**
 * Interface representing the context for parsing Jamf data.
 * Extends the `z.ParseContext` interface from the Zod library, adding a property to the common object.
 * 
 * @interface JamfParseContext
 * @extends {z.ParseContext}
 * 
 * @property {Object} common - Common properties used during parsing from Zod
 * @property {boolean} [common.parseToBSON] - Optional flag indicating whether to parse to BSON (default is `false`).
 * @property {z.ZodIssue[]} common.issues - Array of issues encountered during parsing (same as Zod).
 * @property {z.ZodErrorMap} [common.contextualErrorMap] - Optional map of contextual errors (same as Zod).
 * @property {boolean} common.async - Flag indicating whether the parsing is asynchronous (same as Zod).
 */
export interface JamfParseContext extends z.ParseContext {
    common: {
        readonly parseToBSON?: boolean;
        readonly issues: z.ZodIssue[];
        readonly contextualErrorMap?: z.ZodErrorMap;
        readonly async: (true | false);
    }
}

export interface JamfParseInput extends z.ParseInput {
    parent: JamfParseContext;
}

/**
 * @typedef {Object} JamfParseParams
 * @property {(string | number)[]} path - An array representing the path to the value being parsed.
 * @property {z.ZodErrorMap} errorMap - A custom error map for handling validation errors.
 * @property {boolean} async - A flag indicating whether the parsing should be asynchronous.
 * @property {boolean} parseToBSON - A flag indicating whether the parsed result should be converted to BSON format.
 * 
 * This type definition was adapted from the Zod source code.
 */
export type JamfParseParams = {
    path: (string | number)[];
    errorMap: z.ZodErrorMap;
    async: boolean;
    parseToBSON: boolean;
}

/**
 * This function is directly taken from the Zod source code because it is not exported from Zod.
 * Source: https://github.com/colinhacks/zod
 * 
 * Handles the result of a Zod parsing operation.
 * 
 * @template Input - The type of the input being parsed.
 * @template Output - The type of the output after parsing.
 * @param {z.ParseContext} ctx - The parsing context.
 * @param {z.SyncParseReturnType<Output>} result - The result of the parsing operation.
 * @returns {{ success: true; data: Output } | { success: false; error: z.ZodError<Input> }} - The result of the parsing operation, either successful or containing an error.
 * @throws {Error} If validation fails but no issues are detected.
 */
const handleResult = <Input, Output>(
    ctx: z.ParseContext,
    result: z.SyncParseReturnType<Output>
  ):
    | { success: true; data: Output }
    | { success: false; error: z.ZodError<Input> } => {
    if (z.isValid(result)) {
      return { success: true, data: result.value };
    } else {
      if (!ctx.common.issues.length) {
        throw new Error("Validation failed but no issues detected.");
      }
  
      return {
        success: false,
        get error() {
          if ((this as any)._error) return (this as any)._error as Error;
          const error = new z.ZodError(ctx.common.issues);
          (this as any)._error = error;
          return (this as any)._error;
        },
      };
    }
  };

/**
 * Abstract class representing a Jamf type, extending ZodType with additional functionality.
 * 
 * This class adapts the Zod library's ZodType to support Jamf type definitions and optional parsing to BSON types.
 * 
 * @template Output - The output type of the schema.
 * @template Def - The definition type of the schema, extending JamfTypeDef.
 * @template Input - The input type of the schema, defaults to Output.
 * 
 * @extends z.ZodType<Output, Def, Input>
 * 
 * @method safeParse
 * @param {unknown} data - The data to be parsed.
 * @param {Partial<JamfParseParams>} [params] - Optional parameters for parsing.
 * @returns {z.SafeParseReturnType<Input, Output>} The result of the safe parse operation.
 * 
 * @method safeParseAsync
 * @param {unknown} data - The data to be parsed.
 * @param {Partial<JamfParseParams>} [params] - Optional parameters for parsing.
 * @returns {Promise<z.SafeParseReturnType<Input, Output>>} A promise that resolves to the result of the safe parse operation.
 * 
 * The `safeParse` and `safeParseAsync` methods are adapted from Zod's parsing methods to include additional context for Jamf-specific parsing.
 * This includes support for optional parsing to BSON types, controlled by the `parseToBSON` parameter in `JamfParseParams`.
 */
export abstract class JamfType<Output, Def extends z.ZodTypeDef = z.ZodTypeDef, Input = Output> extends z.ZodType<Output, Def, Input> {
    readonly _type!: Output;
    readonly _output!: Output;
    readonly _input!: Input;
    readonly _def!: Def;

    abstract _parse(input: JamfParseInput): z.ParseReturnType<Output>;

    safeParse(
        data: unknown,
        params?: Partial<JamfParseParams>
      ): z.SafeParseReturnType<Input, Output> {
        const ctx: JamfParseContext = {
          common: {
            issues: [],
            async: params?.async ?? false,
            contextualErrorMap: params?.errorMap,
            parseToBSON: params?.parseToBSON ?? false,
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: z.getParsedType(data),
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    
        return handleResult(ctx, result);
      }
    
      async safeParseAsync(
        data: unknown,
        params?: Partial<JamfParseParams>
      ): Promise<z.SafeParseReturnType<Input, Output>> {
        const ctx: JamfParseContext = {
          common: {
            issues: [],
            contextualErrorMap: params?.errorMap,
            async: true,
            parseToBSON: params?.parseToBSON ?? false,
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: z.getParsedType(data),
        };
    
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await (z.isAsync(maybeAsyncResult)
          ? maybeAsyncResult
          : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
      }

    _processInputParams = super._processInputParams as (input: JamfParseInput) => { status: z.ParseStatus, ctx: JamfParseContext };
}