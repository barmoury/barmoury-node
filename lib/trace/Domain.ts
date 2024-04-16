
export interface Domain {

    ip?: string;
    name?: string;
    created?: string;
    expires?: string;
    changed?: string;
    idnName?: string;
    askWhois?: string;
    nameservers?: string[];
    contacts?: {
        owner?: {
            name?: string;
            email?: string;
            country?: string;
            address?: string;
            organization?: string;
        };
        admin?: {
            name?: string;
            email?: string;
            country?: string;
            address?: string;
            organization?: string;
        };
        tech?: {
            name?: string;
            email?: string;
            country?: string;
            address?: string;
            organization?: string;
        };
    }
    registrar?: {
        url?: string;
        name?: string;
        email?: string;
    };

}

