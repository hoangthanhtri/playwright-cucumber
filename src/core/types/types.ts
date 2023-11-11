export type Options = {
    data?: string | Buffer | Record<string, any>; // Serializable to be represented as a Record<string, unknown>
    failOnStatusCode?: boolean;
    form?: Record<string, any>;
    headers?: Record<string, string>; // This should fix the error you are encountering
    ignoreHTTPSErrors?: boolean;
    maxRedirects?: number;
    multipart?: Record<string, any>;
    params?: Record<string, any>;
    timeout?: number;
  }

export type ReportAttributes = {
    key: string,
    value: string
}

export type ReportResponse = {
    tempId: string,
    promise: Promise<any>
}

export type ReportPortalConnection = {
    apiKey: string,
    endpoint: string,
    launch: string,
    project: string
    debug: boolean
}



  