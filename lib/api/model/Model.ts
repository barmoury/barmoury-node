
import { Timeo } from "../Timeo";
import { Copier } from "../../copier/Copier";
import { QueryArmoury } from "../../eloquent";
import { Optional, Model as SequelizeModel } from 'sequelize';

export interface ModelAttributes {
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ModelInput extends Optional<ModelAttributes, 'id'> {}

export class Model<T1 extends ModelAttributes, T2 extends ModelInput> extends SequelizeModel<T1, T2> implements ModelAttributes {

    public id?: number;
    public createdAt?: Date | undefined;
    public updatedAt?: Date | undefined;

    resolve<T extends Model<any, any>>(baseRequest: Request, queryArmoury?: QueryArmoury, userDetails?: any): any {
        Copier.copy(this, baseRequest);
        Timeo.resolve(this);
        return this;
    }

}

export class Request {
    updateEntityId?: Number;
}
