
import { Validator } from "./Validator";
import { BarmouryObject } from "../util/Types";
import { ControllersValidationMap, prepareObjectAjvSchema, prepareValidationSchema } from "./Validate";

export interface AjvSchemaAttributtes {
    groups?: string[];
    schema: BarmouryObject;
}

export function AjvSchema(attr?: BarmouryObject | AjvSchemaAttributtes) {

    return function (target: any) {
        const schema = (attr && attr.schema) ? attr.schema : attr || {};
        if (attr && attr.groups?.length) {
            for (const group of attr.groups) {
                prepareObjectAjvSchema(Object.getPrototypeOf(target), schema, group);
            }
            return;
        }
        prepareObjectAjvSchema(Object.getPrototypeOf(target), schema);
    };

}

