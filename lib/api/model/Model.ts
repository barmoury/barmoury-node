
import { Timeo } from "../Timeo";
import { Copier } from "../../copier/Copier";
import { QueryArmoury, StatQuery } from "../../eloquent";
import { Optional, Model as SequelizeModel } from 'sequelize';
import { RequestParamFilter } from "../../eloquent/RequestParamFilter";

export interface ModelAttributes {
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ModelInput extends Optional<ModelAttributes, 'id'> { }

export class Model<T1 extends ModelAttributes, T2 extends ModelInput> extends SequelizeModel<T1, T2> implements ModelAttributes {

    @RequestParamFilter({ operator: RequestParamFilter?.Operator?.NONE }) @StatQuery.PercentageChangeQuery() public id?: number;
    @RequestParamFilter({ operator: RequestParamFilter?.Operator?.RANGE }) public createdAt?: Date | undefined;
    @RequestParamFilter({ operator: RequestParamFilter?.Operator?.RANGE }) public updatedAt?: Date | undefined;

    resolve<T extends Model<any, any>>(baseRequest: Request, queryArmoury?: QueryArmoury, userDetails?: any): any {
        Copier.copy(this, baseRequest);
        Timeo.resolve(this);
        return this;
    }

}
(Model as any).fineName = "BarmouryModel";

export class Request {
    updateEntityId?: Number;
}
