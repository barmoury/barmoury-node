
import { Validator } from "./Validator";
import { BarmouryObject } from "../util/Types";
import { ControllersValidationMap, prepareObjectAjvSchema, prepareValidationSchema } from "./Validate";

export interface AjvSchemaAttributtes {
    groups?: string[];
    schema: BarmouryObject;
}

export function AjvSchema(attr?: BarmouryObject | AjvSchemaAttributtes) {

    return function (target: any) {
        const key = `${target}`;
        const groups = attr?.groups || ["CREATE"];
        const schema = (attr && attr.schema) ? attr.schema : attr || {};
        for (const group of groups) {
            prepareObjectAjvSchema(key, schema, group);
        }
    };

}

