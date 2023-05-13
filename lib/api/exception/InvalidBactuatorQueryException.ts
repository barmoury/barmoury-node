
export class InvalidBactuatorQueryException extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, InvalidBactuatorQueryException.prototype);
    }
    
}
