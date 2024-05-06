
import { Device, Location } from "../trace";
import { Model, ModelAttributes, ModelInput } from "../api";
import { RequestParamFilter, StatQuery } from "../eloquent";

export enum Level {
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    TRACE = "TRACE",
    FATAL = "FATAL",
    PANIC = "PANIC",
    VERBOSE = "VERBOSE"
}

export interface LogAttributes extends ModelAttributes {
    level: string;
    group?: string;
    source?: string;
    content: string;
    spanId?: string;
    traceId?: string;
}

interface LogInput extends ModelInput { }

@StatQuery({
    fetchHourly: true, fetchYearly: true, fetchMonthly: true,
    fetchWeekDays: true, fetchPrevious: true, fetchMonthDays: true, enableClientQuery: true
})
export class Log extends Model<LogAttributes, LogInput> {

    static Level = Level;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.STARTS_WITH })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.ENDS_WITH })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    level!: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    group!: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    @StatQuery.OccurrenceQuery()
    source!: string;

    @StatQuery.OccurrenceQuery({ type: StatQuery.OccurrenceQuery.Type.PERCENTAGE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.STARTS_WITH })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.ENDS_WITH })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    content!: string;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.STARTS_WITH })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.ENDS_WITH })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    traceId!: string;

    @RequestParamFilter({ operator: RequestParamFilter.Operator.STARTS_WITH })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.ENDS_WITH })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.LIKE })
    @RequestParamFilter({ operator: RequestParamFilter.Operator.EQ })
    spanId!: string;

}

