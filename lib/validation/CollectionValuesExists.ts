
import { registerValidation } from "./Validated";

export interface CollectionValuesExistsAttributtes {
    table: string;
    column: string;
    message: string;
    groups?: string[];
    whereClause?: string;
}

export function CollectionValuesExists(attr: CollectionValuesExistsAttributtes) {

    return function (target: any, propertyKey: string) {
        const groups = attr.groups || ["CREATE"];
        for (const group of groups) {
            registerValidation(target, group, {
                propertyKey,
                message: attr.message,
                validate: async (sequelize: any, collection: any, opt: any) => {
                    for (const value of collection) {
                        const [result, _] = await sequelize.query(`SELECT count(*) as count FROM ${attr.table} `
                            + ` WHERE ${attr.column} = $self` + (!attr.whereClause?.length
                                ? "" : ` AND ${attr.whereClause?.length}`) + (opt.resourceId ? " AND id != $id" : ""), {
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
