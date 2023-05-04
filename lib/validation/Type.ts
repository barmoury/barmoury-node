
import { Validator } from "./Validator";
import { BarmouryObject } from "../util/Types";
import { ControllersValidationMap, prepareValidationSchema } from "./Validate";

export interface TypeAttributtes {
    groups?: string[];
    value: string | string[];
}

export function Type(options: TypeAttributtes) {

    return function (target: any, propertyKey: string) {
        const groups = options?.groups || ["CREATE"];
        const key = `${target.constructor}`;
        for (const group of groups) {
            prepareValidationSchema(key, propertyKey, target, group);
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["type"] = options.value;
        }
    };

}
