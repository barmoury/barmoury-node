
import { Model } from "../Model";
import { Optional } from 'sequelize';
import { StatQuery } from "../../../eloquent";
import { RequestParamFilter } from "../../../eloquent/RequestParamFilter";

export interface IdModelAttributes {
    id?: number;
}

export interface IdModelInput extends Optional<IdModelAttributes, 'id'> { }

export class IdModel<T1 extends IdModelAttributes, T2 extends IdModelInput, T = number> extends Model<T1, T2> implements IdModelAttributes {

    @RequestParamFilter({ operator: RequestParamFilter?.Operator?.NONE }) @StatQuery.PercentageChangeQuery() public id?: T | any;

}
(IdModel as any).fineName = "BarmouryIdModel";
