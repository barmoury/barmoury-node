
export class ContraintValidationError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, ContraintValidationError.prototype);
    }
    
}
