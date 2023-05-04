import { BarmouryObject } from "../../util";

export class AjvValidationError extends Error {

    group: string;
    validation: any[];
    statusCode: number;

    constructor(validation: BarmouryObject[], statusCode: number = 400, group: string = "body") {
        super(AjvValidationError.cleanError(validation[0]));
        this.group = group;
        this.statusCode = statusCode;
        this.validation = validation;
        Object.setPrototypeOf(this, AjvValidationError.prototype);
    }

    static cleanError(err: BarmouryObject, group: string = "body") {
        //console.log(">>>>>", err);
        let path = err.instancePath?.substr(1).replace(/\//g, ".");
        let message = err.message;
        if (err.instancePath) path = "." + path + " ";
        if (err.params?.allowedValues) message += ` [${err.params?.allowedValues}]`;
        if (err.params?.additionalProperty) message += ` '${err.params?.additionalProperty}'`;
        return `${group}${path || " "}${message}`;
    }

}
