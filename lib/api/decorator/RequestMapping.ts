
import { BarmouryObject } from "../../util/Types";
import { RequestMethod } from "../enum/RequestMethod";

export const ControllersRequestMap: BarmouryObject = {};

export interface RequestMappingAttributes {

    model?: object;
    value?: string;
    request?: Object;
    method?: RequestMethod;
    bodySchema?: BarmouryObject;
    querySchema?: BarmouryObject;
    paramsSchema?: BarmouryObject;
    headersSchema?: BarmouryObject;

}

export function RequestMapping(options: string | RequestMappingAttributes) {
    return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
        if (descriptor) {
            descriptor.value.__barmoury_requestMapping = options;
        } else {
            // cannot modify class in TS, so store mapping in global map
            ControllersRequestMap[target.name] = options;
        }
    };
}

