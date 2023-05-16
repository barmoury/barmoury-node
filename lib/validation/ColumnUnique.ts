
import { registerValidation } from "./Validate";

export interface ColumnUniqueAttributtes {
    table: string;
    column: string;
    message: string;
    groups?: string[];
    whereClause?: string;
}

export function ColumnUnique(attr: ColumnUniqueAttributtes) {

    return function (target: any, propertyKey: string) {
        const groups = attr.groups || ["CREATE"];
        for (const group of groups) {
            registerValidation(target, group, {
                propertyKey,
                message: attr.message,
                validate: async (sequelize: any, value: any, opt: any) => {
                    const [result, _] = await sequelize.query(`SELECT count(*) as count FROM ${attr.table} `
                        + ` WHERE ${attr.column} = $self` + (!attr.whereClause?.length
                            ? "" : ` AND ${attr.whereClause}`) + (opt.resourceId ? " AND id != $id" : ""), {
                        bind: {
                            self: value,
                            id: opt.resourceId
                        },
                    });
                    if ("count" in result[0]) {
                        return result[0]["count"] === 0;
                    }
                    return false;
                }
            });
        }
    };

}
