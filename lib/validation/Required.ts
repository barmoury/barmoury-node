
import { Validator } from "./Validator";
import { BarmouryObject } from "../util/Types";
import { ControllersValidationMap, prepareValidationSchema } from "./Validate";

export interface RequiredAttributtes {
    message?: string;
    groups?: string[];
}

export function Required(options?: RequiredAttributtes) {

    return function (target: any, propertyKey: string) {
        const groups = options?.groups || ["CREATE"];
        const key = `${target.constructor}`;
        for (const group of groups) {
            prepareValidationSchema(key, propertyKey, target, group);
            ControllersValidationMap[key]["body"][group]["required"].push(propertyKey);
        }
    };

}
