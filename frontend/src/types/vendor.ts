export interface Vendor {
    id: string;
    code: string;
    name: string;
    payableAccountId?: string;
    payableAccount?: {
        id: string;
        code: string;
        name: string;
    };
    taxId?: string;
    gstNumber?: string;
    paymentTerms?: number;
    address?: string;
    contact?: string;
    phone?: string;
    email?: string;
    website?: string;
    currency?: string;
    securityDeposit?: number;
    notes?: string;
    vendorType?: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
}

export interface CreateVendorDto {
    name: string;
    payableAccountId?: string;
    taxId?: string;
    gstNumber?: string;
    paymentTerms?: number;
    address?: string;
    contact?: string;
    phone?: string;
    email?: string;
    website?: string;
    currency?: string;
    securityDeposit?: number;
    securityDeposit?: number;
    notes?: string;
    vendorType?: string;
}

export interface UpdateVendorDto extends Partial<CreateVendorDto> { }
