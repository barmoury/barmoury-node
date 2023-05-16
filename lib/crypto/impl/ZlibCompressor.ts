
import { IEncryptor } from "../IEncryptor";
import fastJson from "fast-json-stringify";

const zlib = require('zlib');

export class ZlibCompressor implements IEncryptor<any> {

    stringify = fastJson({});

    encrypt(t: any): string {
        if (!t) return "";
        return zlib.deflateSync(this.stringify(t)).toString('base64');
    }

    decrypt(encrypted: string): any {
        if (!encrypted || !encrypted.length) return undefined;
        const decrypted = zlib.inflateSync(Buffer.from(encrypted, 'base64')).toString();
        try { return JSON.parse(decrypted); } catch (ignored) { return decrypted; }
    }

}
