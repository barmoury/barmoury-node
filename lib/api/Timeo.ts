
import { Model } from "./model/Model";

export const Timeo = {

    resolve(model: Model<any, any>) {
        if (!model.id) { Timeo.resolveCreated(model); }
        else { Timeo.resolveUpdated(model); }
    },

    resolveCreated(model: Model<any, any>) {
        model.createdAt = (new Date());
        Timeo.resolveUpdated(model);
    },

    resolveUpdated(model: Model<any, any>) {
        model.updatedAt = new Date();
    }

}
