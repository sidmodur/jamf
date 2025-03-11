import { INVALID, z } from "zod";
import { JamfFirstPartyTypeKind, JamfParseContext, JamfParseInput, JamfType } from "./JamfType";
import * as bson from "bson";
import * as util from "./JamfUtilities";



interface JamfObjectIdDef extends z.ZodTypeDef {
    typeName: JamfFirstPartyTypeKind.ObjectID;
}

export type ObjectIdSchemaInput = string | bson.ObjectId | bson.ObjectIdLike | bson.ObjectIdExtended;

export class JamfObjectId extends JamfType<bson.ObjectId, JamfObjectIdDef> {
    _parse(input: JamfParseInput): z.ParseReturnType<bson.ObjectId> {
        const { status, ctx } = this._processInputParams(input)
        if (input.data instanceof bson.ObjectId) {
            if (ctx.common.parseToBSON) {
                return { status: "valid", value: input.data }
            } else {
                return { status:"valid", value: new bson.ObjectId(input.data.toHexString()) }
            }
        } else {
            let val = "";
            if (typeof input.data === "string") {
                val = input.data;
            } else if (input.data instanceof Object && input.data.$oid) {
                val = input.data.$oid;
            } else {
                z.addIssueToContext(ctx, {
                    code: z.ZodIssueCode.invalid_type,
                    expected: `${bson.ObjectId.name} | string` as any,
                    received: util.getUnkownType(input.data) as any,
                })
                return INVALID
            }

            try {
                const retval = new bson.ObjectId(val)
                return {status: "valid", value: ctx.common.parseToBSON? retval : retval.toHexString() as any}
            } catch (e) {
                z.addIssueToContext(ctx, {
                    code: z.ZodIssueCode.custom,
                    message: (e as Error).message ?? "unknown error",
                })
                return INVALID
            }

        }
    }

    static create = () => new JamfObjectId({
        typeName: JamfFirstPartyTypeKind.ObjectID
    });
}

export const objectid = JamfObjectId.create; 

interface JamfDBRefDef extends z.ZodTypeDef {
    typeName: JamfFirstPartyTypeKind.ObjectID;
}

export type DBRefSchemaInput = bson.DBRef | {
    $ref: string;
    $id: ObjectIdSchemaInput;
    $db?: string;
}

export class JamfDBRef extends JamfType<bson.DBRef, JamfDBRefDef> {
    objectIDSchema = objectid();
    _parse(input: JamfParseInput): z.ParseReturnType<bson.DBRef> {
        const { status, ctx } = this._processInputParams(input)
        if (input.data instanceof bson.DBRef) {
            return { status: "valid", value: input.data }
        } else {
            if (typeof input.data === "object" && input.data.$ref && input.data.$id) {
                return util.handleNestedParsing(this.objectIDSchema, "$id", input, input.data.$id, (result) => {
                    if (result.status === "valid") {
                        try {
                            return { status: "valid", value: new bson.DBRef(input.data.$ref, result.value, input.data.$db) }
                        } catch (e) {
                            z.addIssueToContext(ctx, {
                                code: z.ZodIssueCode.custom,
                                message: (e as Error).message ?? "unknown error",
                            })
                            return INVALID
                        }
                    } else {
                        return INVALID
                    }
                })
            } else {
                z.addIssueToContext(ctx, {
                    code: z.ZodIssueCode.invalid_type,
                    expected: `${bson.DBRef.name}` as any,
                    received: util.getUnkownType(input.data) as any,
                })
                return INVALID
            }
        }
    }

    static create = () => new JamfObjectId({
        typeName: JamfFirstPartyTypeKind.ObjectID
    });
}

export const dbref = JamfDBRef.create;

export const regex = () => z.instanceof(RegExp)

export const code = () => z.instanceof(bson.Code)

