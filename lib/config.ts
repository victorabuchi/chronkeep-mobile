// Where ChronKeep's cloud lives. Set EXPO_PUBLIC_API_URL (for example in eas.json or a .env file) to your Render address;
// the fallback is the address the Render blueprint gives the service.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://chronkeep.onrender.com').replace(/\/$/, '');
// The phone app's own address for the browser to hand a sign-in back to (app.json: scheme).
export const APP_SCHEME_URL = 'chronkeep://auth';
