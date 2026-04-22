declare module 'mammoth' {
  export interface ExtractRawTextOptions {
    path: string;
  }
  
  export interface ExtractRawTextResult {
    value: string;
    messages: any[];
  }
  
  export function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>;
}
