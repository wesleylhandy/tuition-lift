declare module "whois-json" {
  interface WhoisResult {
    creationDate?: string;
    creation_date?: string;
    [key: string]: unknown;
  }
  function whois(
    domain: string,
    options?: { follow?: number; verbose?: boolean }
  ): Promise<WhoisResult>;
  export = whois;
}
