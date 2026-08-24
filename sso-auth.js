function testZohoLogin() {
  // 1. Your Client ID from the Zoho screenshot
  const clientId = "762554.RJXHFUZYYX8TZTXUJ95H7Y1E5JQZIJ"; 
  
  // 2. Where Zoho should send you back 
  const redirectUri = "https://iamahsan.org"; 
  
  // 3. Paste your FULL Authorization Endpoint from Zoho here
  const authEndpoint = "https://directory.zoho.eu/p/20118762554/app/277463000000002049/sso/authorize"; 
  
  // Build the login URL
  const loginUrl = `${authEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid profile email`;
  
  // Send the user to Zoho!
  window.location.href = loginUrl;
}