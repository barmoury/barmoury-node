
import { ControllersValidationMap, prepareValidationSchema } from "./Validated";

export interface TypeAttributes {
    groups?: string[];
    value: string | string[];
}

export function Type(options: TypeAttributes) {

    return function (target: any, propertyKey: string) {
        const groups = options?.groups ?? ["CREATE"];
        const key = `${target.constructor}`;
        for (const group of groups) {
            prepareValidationSchema(key, propertyKey, target, group);
            ControllersValidationMap[key]["body"][group]["properties"][propertyKey]["type"] = options.value;
        }
    };

}

export const Kind = Type;
export type KindAttributes = TypeAttributes;
