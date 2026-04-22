import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "c33372df-57cc-4c65-b8c6-f379d4fa1ad4",
    authority: "https://login.microsoftonline.com/gtmgrupo.onmicrosoft.com",
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: "localStorage"
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);