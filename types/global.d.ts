// Declare Meta Pixel global function
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _klOnsite: any; 
    klaviyo?:any;
  }
}

export {};