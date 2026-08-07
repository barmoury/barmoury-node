
export const ValueGenerator = {

    generateRandomString(saltCharsOrLength: string | number, lengthP?: number) {
        let length: number = lengthP ?? 5;
        let saltChars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
        if (typeof saltCharsOrLength === "string") {
            saltChars = saltCharsOrLength;
        } else if (typeof saltCharsOrLength === "number") {
            length = saltCharsOrLength;
        }
        let salt: string = "";
        while (salt.length < length) {
            let index = Math.round(Math.random() * salt.length);
            salt += saltChars.charAt(index);
        }
        return salt;
    },

}
