function testZohoLogin() {
  const clientId = "762554.RJXHFUZYYX8TZTXUJ95H7Y1E5JQZIJ"; 
  
  // Notice the slash at the end! This MUST match Zoho exactly.
  const redirectUri = "https://iamahsan.org"; 
  
  // REPLACE THIS WITH YOUR REAL URL AGAIN
  const authEndpoint = "https://directory.zoho.eu/p/20118762554/app/277463000000002049/sso/authorize"; 
  
  // This safely builds the URL so we don't get formatting errors
  const url = new URL(authEndpoint);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("scope", "openid"); // simplified scope
  
  // Send the user to Zoho!
  window.location.href = url.toString();
}