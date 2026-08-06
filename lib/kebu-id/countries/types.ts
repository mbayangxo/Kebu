/** Country business-structure modules — isolated per country; never hardcode SN globally. */

export type LegalStructure = {
  code: string;
  label: string;
  description?: string;
};

export type CountryBusinessModule = {
  countryCode: string;
  countryName: string;
  moduleVersion: string;
  legalStructures: LegalStructure[];
  regions: string[];
};

export type GovernmentConnector = {
  countryCode: string;
  /** True only for real live connectors. Mock must be false. */
  isLive: boolean;
  submitRegistration(input: {
    businessId: string;
    payload: Record<string, unknown>;
  }): Promise<{ externalRef: string; status: string; messages: string[] }>;
  checkStatus(externalRef: string): Promise<{ status: string; messages: string[] }>;
  retrieveMessages(externalRef: string): Promise<string[]>;
  retrieveCertificate(externalRef: string): Promise<{ url: string | null; available: boolean }>;
  cancelApplication(externalRef: string): Promise<{ cancelled: boolean }>;
};
