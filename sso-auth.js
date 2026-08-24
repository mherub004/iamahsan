function testZohoLogin() {
  const clientId = "762554.RJXHFUZYYX8TZTXUJ95H7Y1E5JQZIJ"; 
  const redirectUri = "https://iamahsan.org"; // Make sure your Zoho dashboard matches this exactly (no slash)
  
  // REPLACE THIS WITH YOUR REAL ZOHO URL
  const authEndpoint = "https://directory.zoho.eu/p/20118762554/app/277463000000002049/sso/authorize"; 
  
  const url = new URL(authEndpoint);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  
  // 1. Expand the scope so Zoho knows what data to request
  url.searchParams.append("scope", "openid profile email"); 
  
  // 2. Add mandatory security checks to satisfy Zoho's firewall
  url.searchParams.append("state", "secure_test_state_12345"); 
  url.searchParams.append("nonce", "secure_test_nonce_67890"); 
  
  window.location.href = url.toString();
}