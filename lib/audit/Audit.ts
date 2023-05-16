
import { Device, Isp, Location } from "../trace";
import { Model, ModelAttributes, ModelInput } from "../api";
import { RequestParamFilter, StatQuery } from "../eloquent";

export interface AuditAttributes<T> extends ModelAttributes {
    actor?: T;
    isp: Isp;
    type: string;
    group?: string;
    auditable: any;
    extraData: any;
    device: Device;
    source: string;
    action: string;
    status?: string;
    auditId?: string;
    actorId?: string;
    ipAddress: string;
    location: Location;
    actorType?: string;
    environment?: string;
}

interface AuditInput extends ModelInput { }

@StatQuery({
    fetchHourly: true, fetchYearly: true, fetchMonthly: true,
    fetchWeekDays: true, fetchPrevious: true, fetchMonthDays: true, enableClientQuery: true
})
export class Audit<T> extends Model<AuditAttributes<T>, AuditInput> {

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    type?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    group?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    status?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    source?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    action?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    actorId?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    auditId?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    actorType?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    ipAddress?: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    environment?: string;

    actor?: T;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    isp?: Isp;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    device?: Device;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    location?: Location;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE, columnObjectFieldsIsSnakeCase: false })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    auditable?: any;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.OBJECT_LIKE, columnObjectFieldsIsSnakeCase: false })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    extraData?: any;

}


