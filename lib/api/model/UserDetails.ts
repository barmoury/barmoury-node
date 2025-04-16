

export class UserDetails<T> {

    private data?: T;
    private id: string;
    private language: string;
    private authorityPrefix?: string;
    private authoritiesValues: string[];
    private authorities?: string[];

    constructor(id: string, authoritiesValuesOrData: string[] | T, data?: T, language: string = "en", authorityPrefix?: string) {
        this.id = id;
        this.data = data;
        this.language = language;
        this.authoritiesValues = [];
        this.authorityPrefix = authorityPrefix;
        if (Array.isArray(authoritiesValuesOrData)) {
            this.authoritiesValues = authoritiesValuesOrData;
        } else {
            this.data = authoritiesValuesOrData;
        }
    }

    getId() {
        return this.id;
    }

    getUsername() {
        return this.id;
    }

    getData() {
        return this.data;
    }

    getLanguage() {
        return this.language;
    }

    getAuthorities() {
        if (!this.authorities) this.authorities = (this.authorityPrefix ? this.authoritiesValues.map(a => this.authorityPrefix + a): this.authoritiesValues);
        return this.authorities;
    }

}

export function initUserDetails<T>(id: string, authoritiesValues: string[], data?: T, language: string = "en", authorityPrefix?: string): UserDetails<T> {
    return new UserDetails<T>(
        id,
        authoritiesValues,
        data,
        language,
        authorityPrefix,
    );
}
