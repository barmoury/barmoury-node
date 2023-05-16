
export interface UserDetails<T> {
    data?: T;
    id: string;
    authorityPrefix?: string;
    authoritiesValues: string[];
}

export function initUserDetails<T>(id: string, authoritiesValues: string[], data?: T, authorityPrefix?: string): UserDetails<T> {
    const userDetails: UserDetails<T> = {
        id,
        data,
        authorityPrefix,
        authoritiesValues
    };
    return userDetails as UserDetails<T>;
}