
import { StatQuery } from "../../eloquent";
import { Device, Isp, Location } from "../../trace";
import { Model, ModelAttributes, ModelInput } from "./Model";
import { DataTypes, InitOptions, Sequelize } from "sequelize";
import { RequestParamFilter } from "../../eloquent/RequestParamFilter";

export interface SessionAttributes extends ModelAttributes {
    isp: Isp;
    device: Device;
    extraData: any;
    status: string;
    deletedAt: Date;
    actorId: string;
    actorType: Date;
    sessionId: string;
    ipAddress: string;
    location: Location;
    refreshCount: number;
    sessionToken: string;
    expirationDate: Date;
    lastAuthToken: string;
}

interface SessionInput extends ModelInput { }

@StatQuery({
    fetchHourly: true, fetchYearly: true, fetchMonthly: true,
    fetchWeekDays: true, fetchPrevious: true, fetchMonthDays: true, enableClientQuery: true
})
export class Session<T> extends Model<SessionAttributes, SessionInput> {

    @RequestParamFilter()
    @StatQuery.AverageQuery()
    @StatQuery.PercentageChangeQuery()
    @StatQuery.ColumnQuery({ name: "%s_sum", sqlFunction: "SUM" })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.RANGE })
    @StatQuery.PercentageChangeQuery({ sqlFunction: "SUM", name: "%s_sum_percentage_change" })
    public refreshCount!: number;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    public actorId!: string;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    public actorType!: string;

    @StatQuery.OccurrenceQuery()
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQueryType.PERCENTAGE })
    public sessionId!: string;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    public sessionToken!: string;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    public lastAuthToken!: string;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.RANGE })
    public expirationDate!: Date;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQueryType.PERCENTAGE })
    public ipAddress!: string;

    @StatQuery.OccurrenceQuery()
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQueryType.PERCENTAGE })
    @StatQuery.ColumnQuery({ name: "total_active", sqlFunction: "COUNT", whereClause: { raw: "%s = 'ACTIVE'" } })
    @StatQuery.ColumnQuery({ name: "total_inactive", sqlFunction: "COUNT", whereClause: { raw: "%s = 'INACTIVE'" } })
    public status: string = "ACTIVE";

    actor?: T;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE })
    isp!: Isp;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE })
    device!: Device;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE })
    location!: Location;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE, columnObjectFieldsIsSnakeCase: false })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE, columnObjectFieldsIsSnakeCase: false })
    public extraData!: any;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.RANGE })
    public deletedAt!: Date;

}
(Session as any).fineName = "BarmourySession";

export function buildSessionSchema<T>(sequelizeConnection: Sequelize, attributes?: any, options?: Partial<InitOptions<Session<T>>>): [any, InitOptions<Session<T>>] {
    return [
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            refreshCount: {
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            actorId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            actorType: {
                type: DataTypes.STRING,
                allowNull: false
            },
            sessionId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            sessionToken: {
                type: DataTypes.STRING,
                allowNull: false
            },
            lastAuthToken: {
                type: DataTypes.STRING,
                allowNull: false
            },
            status: {
                type: DataTypes.BOOLEAN,
                defaultValue: "ACTIVE",
                allowNull: false
            },
            expirationDate: {
                type: DataTypes.DATE,
                allowNull: false
            },
            ipAddress: {
                type: DataTypes.STRING,
                allowNull: false
            },
            isp: {
                type: DataTypes.STRING,
                allowNull: false
            },
            device: {
                type: DataTypes.STRING,
                allowNull: false
            },
            location: {
                type: DataTypes.STRING,
                allowNull: false
            },
            extraData: {
                type: DataTypes.JSON,
                allowNull: true
            },
            deletedAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            ...attributes,
        },
        {
            timestamps: true,
            underscored: true,
            tableName: "sessions",
            sequelize: sequelizeConnection,
            ...options,
        }
    ];
};

// example usage: Session.init(...buildSessionSchema(null as any));

export default Session;