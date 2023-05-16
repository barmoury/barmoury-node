
export class InvalidParameterError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, InvalidParameterError.prototype);
    }
    
}
