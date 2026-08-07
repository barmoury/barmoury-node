
import { FieldUtil } from "../util";
import { BarmouryObject } from "../util/Types";
import { __BarmouryJsonPropertyMap } from "../globals";

export enum JsonPropertyAccess {

    READ = "READ",
    WRITE = "WRITE",
    READ_WRITE = "READ_WRITE"

}

export const ControllersRequestMap: BarmouryObject = {};

export interface JsonPropertyAttributes {

    key?: string;
    value?: string;
    options?: Object;
    access: JsonPropertyAccess;
    serializer?: (field: any) => any;
    deserializer?: (field: any) => any;

}

export function JsonProperty(options: JsonPropertyAttributes) {
    return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
        const key = `${target.constructor}`;
        if (!(key in __BarmouryJsonPropertyMap)) {
            __BarmouryJsonPropertyMap[key] = {};
        }
        if (!propertyKey) return;
        __BarmouryJsonPropertyMap[key][propertyKey] = options;
    };
}

export function findModelFieldJsonProperty(model: any, fieldName: string) {
    let jsonPropertyAttributes: JsonPropertyAttributes | undefined;
    FieldUtil.traversePrototypeWithSupers(model, (prototipe: Function) => {
        jsonPropertyAttributes = __BarmouryJsonPropertyMap?.[`${prototipe.prototype.constructor}`]?.[fieldName];
        return !!jsonPropertyAttributes;
    });
    return jsonPropertyAttributes;
}

export function ApplyJsonPropertyToModel(model: any) {
    const dataValues = FieldUtil.getActualDataFields(model ?? {});
    for (const key of Object.keys(dataValues.fields)) {
        const jsonPropertyAttributes = findModelFieldJsonProperty(model, key);
        if (!jsonPropertyAttributes) continue;
        if (jsonPropertyAttributes.access === JsonPropertyAccess.WRITE) {
            delete model[key];
            if (dataValues.location === "dataValues") {
                delete model.dataValues[key];
            }
        }
    }
}
