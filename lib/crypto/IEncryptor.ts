
export interface IEncryptor<T> {

    encrypt(t: T): string;
    decrypt(encrypted: string): T;

}
