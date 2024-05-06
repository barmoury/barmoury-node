
import { BarmouryObject } from "../util/Types";
import { prepareObjectAjvSchema } from "./Validated";

export interface AjvSchemaAttributes {
    groups?: string[];
    value: BarmouryObject;
    schema: BarmouryObject;
}

export function AjvSchema(attr?: BarmouryObject | AjvSchemaAttributes) {

    return function (target: any) {
        const key = `${target}`;
        const groups = attr?.groups || ["CREATE"];
        const schema = (attr && (attr.schema || attr.value)) ? attr.schema ?? attr.value : attr ?? {};
        for (const group of groups) {
            prepareObjectAjvSchema(key, schema, group);
        }
    };

}

export const Schema = AjvSchema;

