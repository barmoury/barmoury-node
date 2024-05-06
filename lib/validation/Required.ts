
import { ControllersValidationMap, prepareValidationSchema } from "./Validated";

export interface RequiredAttributes {
    message?: string;
    groups?: string[];
}

export function Required(options?: RequiredAttributes) {

    return function (target: any, propertyKey: string) {
        const groups = options?.groups || ["CREATE"];
        const key = `${target.constructor}`;
        for (const group of groups) {
            prepareValidationSchema(key, propertyKey, target, group);
            ControllersValidationMap[key]["body"][group]["required"].push(propertyKey);
        }
    };

}
