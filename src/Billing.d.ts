/// <reference types="long" />
import { services } from "./proto";
import billing = services.interfaces.billing;
export declare class BillingAPI {
    getSimpleBill(login: string, tenantName: string, period: {
        from: number | Long;
        to: number | Long;
    }): Promise<billing.ITenantSimpleBill>;
}
