import { JamfParseContext, JamfParseInput, JamfParseParams } from "./JamfType"
import { z } from "zod"

export function getUnkownType(data: unknown): string {
    if (typeof data === "object") {
        return data? data.constructor.name : "null"
    } else {
        return typeof data
    }
}

export type nestedParsingHandler<NestedOutput, Output> =
    (result: z.SyncParseReturnType<NestedOutput>) => z.ParseReturnType<Output>;

export function handleNestedParsing<T> (
    schema: z.ZodTypeAny, 
    path: (string | number) | (string | number)[],
    input: JamfParseInput, 
    data: unknown,
    logic: nestedParsingHandler<z.infer<typeof schema>, T>
): z.ParseReturnType<T> {
    const inputParams = {
        data: data,
        path: input.path.concat(path),
        parent: input.parent
    }

    if (input.parent.common.async) {
        return schema._parseAsync(inputParams).then(logic)
    } else {
        return logic(schema._parseSync(inputParams))
    }
}