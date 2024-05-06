
import { ControllersValidationMap, prepareValidationSchema } from "./Validated";

export interface NotBlankAttributes {
    groups?: string[];
    value: string | string[];
}

export function NotBlank(options: NotBlankAttributes) {

    return function (target: any, propertyKey: string) {
        const groups = options?.groups || ["CREATE"];
        const key = `${target.constructor}`;
        for (const group of groups) {
            prepareValidationSchema(key, propertyKey, target, group);
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["minLength"] = options.value;
        }
    };

}
