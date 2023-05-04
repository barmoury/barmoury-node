
import { Validator } from "./Validator";
import { BarmouryObject } from "../util/Types";
import { ControllersValidationMap, prepareValidationMap } from "./Validate";

export interface CollectionValuesExistsAttributtes {
    table: string;
    column: string;
    message: string;
    groups?: string[];
}

export function CollectionValuesExists(attr: CollectionValuesExistsAttributtes) {

    return function (target: any, propertyKey: string) {
        const groups = attr.groups || ["CREATE"];
        const key = `${target.constructor}`;
        for (const group of groups) {
            prepareValidationMap(key, group);
            ControllersValidationMap[key]["__bamoury__validation_queries__"][group].push({
                propertyKey,
                message: attr.message,
                validate: async (sequelize: any, collection: any, opt: any) => {
                    for (const value of collection) {
                        const [result, _] = await sequelize.query(`SELECT count(*) as count FROM ${attr.table} WHERE ${attr.column} = $self` + (opt.resourceId ? " AND id != $id" : ""), {
                            bind: {
                                self: value,
                                id: opt.resourceId
                            },
                        });
                        if ("count" in result[0] && result[0]["count"] == 0) {
                            return false;
                        }
                    }
                    return true;
                }
            });
        }
    };

}
