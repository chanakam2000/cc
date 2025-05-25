/**
 * @file conquerClubLogin.gs
 * @description Google Apps Script to attempt login to ConquerClub.com and report status.
 *
 * PURPOSE OF THE SCRIPT:
 * This script attempts to log into your ConquerClub.com account using the
 * credentials you provide. It then writes the outcome of the login attempt
 * (e.g., "Login Successfull", "Login Unsuccessfull") into cell A1 of the
 * currently active Google Sheet.
 *
 * HOW TO USE:
 * 1. Open the Google Apps Script editor associated with your Google Sheet.
 * 2. Locate the `testLogin()` function within this script.
 * 3. **VERY IMPORTANT**: You MUST replace the placeholder credentials
 *    `"testuser"` and `"testpass"` inside the `testLogin()` function with your
 *    actual Conquer Club username and password.
 *    Example: loginToConquerClub("yourActualUsername", "yourActualPassword");
 * 4. Select the `testLogin` function from the function dropdown menu in the
 *    Apps Script editor toolbar.
 * 5. Click the "Run" button (looks like a play icon).
 *
 * INTERPRETING OUTPUT (in cell A1 of your sheet):
 * - "Login Successfull": The script successfully received a response from
 *   ConquerClub that indicates a login was likely successful (e.g., a redirect
 *   to a page other than the login page).
 * - "Login Unsuccessfull": This can mean several things:
 *     - Incorrect username or password.
 *     - The login form on ConquerClub.com has changed, and this script needs
 *       to be updated to match the new structure.
 *     - Other login errors returned by the site.
 * - "Login Failed: Error during request...": This usually indicates a network
 *   issue, a problem with Google's UrlFetchApp service at that moment, or a
 *   more fundamental error within the script itself.
 *
 * VIEWING LOGS FOR DEBUGGING:
 * If you encounter issues, especially "Login Unsuccessfull" or errors:
 * 1. In the Apps Script editor, go to "View" > "Logs" (or Ctrl+Enter / Cmd+Enter).
 * 2. Alternatively, go to "View" > "Executions" to see a history of runs
 *    and their logs.
 * The logs may contain more detailed error messages from `console.log` or
 * `console.error` that can help pinpoint the problem.
 *
 * SECURITY WARNING - HARDCODED CREDENTIALS:
 * Having your username and password written directly into the `testLogin()`
 * function is a **SECURITY RISK**. If you share this Google Sheet or a copy
 * of it, or if someone else gains access to your Google Account, your
 * Conquer Club credentials could be exposed.
 *
 * SUGGESTION FOR BETTER SECURITY:
 * For more secure storage of credentials, consider using Google Apps Script's
 * `PropertiesService` (e.g., `PropertiesService.getUserProperties()`). This service
 * allows you to store credentials in a way that is not directly visible in the
 * script code and is tied to your user account. This is a more advanced topic
 * you might want to explore if you plan to use this script regularly.
 *
 * POTENTIAL FOR WEBSITE CHANGES:
 * Please be aware that websites like ConquerClub.com can update their login
 * page structure or mechanisms at any time. If this happens, the script may
 * stop working correctly and would require modifications to adapt to the
 * new login process.
 */

/**
 * Attempts to log in to ConquerClub.com using the provided credentials.
 * Writes the login status to cell A1 of the active sheet.
 *
 * @param {string} username The ConquerClub username.
 * @param {string} password The ConquerClub password.
 */
function loginToConquerClub(username, password) {
  // 1. Define the login URL
  var loginUrl = 'https://www.conquerclub.com/login.php';

  // 2. Construct the payload for the POST request
  var payload = {
    'username': username,
    'password': password,
    'submit': 'Login',   // Changed from 'login' to 'submit', and value is 'Login'
    'direct': 'yes',     // Added hidden field
    'connect': '',       // Added hidden field with empty value
    'redirect': '',      // Added hidden field with empty value
    'protocol': 'HTTPS'  // Added hidden field
    // The 'event': 'login' field has been removed as per user request.
  };

  // 3. Define the options for UrlFetchApp.fetch()
  var options = {
    'method': 'post',
    'payload': payload,
    'followRedirects': false, // Crucial for inspecting redirect headers
    'muteHttpExceptions': true // Allows handling of non-200 responses
  };

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (!sheet) {
    console.error('No active sheet found. Please open a spreadsheet to see the results.');
    // Potentially show a UI message if this script is run from a context without an active sheet
    // For now, we'll just log and the function will try to proceed, likely failing at getRange('A1')
  }


  // 4. Use a try...catch block to wrap the UrlFetchApp.fetch() call
  try {
    // 5. Inside the try block:
    var response = UrlFetchApp.fetch(loginUrl, options);
    var responseCode = response.getResponseCode();
    var headers = response.getHeaders();
    var locationHeader = headers['Location'] || headers['location']; // Header names can be case-insensitive

    // Default status, to be overwritten by success or specific failure conditions
    var loginStatus = "Login Unsuccessfull";

    // 5. Login Success Logic:
    // Check for redirect codes (301, 302, 303, 307)
    if (responseCode == 301 || responseCode == 302 || responseCode == 303 || responseCode == 307) {
      if (locationHeader && !locationHeader.includes('login.php')) {
        // If Location header exists and doesn't point back to login.php,
        // it's a successful login (e.g., redirect to player.php or index.php)
        loginStatus = "Login Successfull";
      } else if (locationHeader && locationHeader.includes('login.php')) {
        // If it redirects back to login.php (e.g., login.php?error=1), it's a failed login
        loginStatus = "Login Unsuccessfull - Redirected to login page";
      } else {
        // Other redirect scenarios, treat as unsuccessful for now
        loginStatus = "Login Unsuccessfull - Redirected to an unexpected page: " + locationHeader;
      }
    } 
    // 5. Login Failure Logic (based on response code 200 or other non-redirects):
    else if (responseCode == 200) {
      // A 200 OK response usually means the login page was reloaded, possibly with an error message.
      console.log("DEBUG: Response content on 200 status: " + response.getContentText()); // <-- ADD THIS LINE
      loginStatus = "Login Unsuccessfull - Received status 200 (likely login page reload)";
      // You could try to get more info:
      // var content = response.getContentText();
      // if (content.includes("Invalid Password") || content.includes("User Not Found")) {
      //   loginStatus = "Login Unsuccessfull - Invalid credentials";
      // }
    } else {
      // Other unexpected response codes
      loginStatus = "Login Unsuccessfull - Unexpected response code: " + responseCode;
    }
    
    if (sheet) {
        sheet.getRange('A1').setValue(loginStatus);
    } else {
        console.warn("No active sheet to write status: " + loginStatus);
    }

  } catch (e) {
    // 6. Inside the catch (e) block:
    console.error('Login Error:', e);
    if (sheet) {
        sheet.getRange('A1').setValue("Login Failed: Error during request - " + e.toString());
    } else {
        console.error("Login Failed: Error during request - " + e.toString() + " (No active sheet to write details)");
    }
  }
}

/**
 * A simple test function to demonstrate how to call loginToConquerClub.
 * Users should replace "testuser" and "testpass" with their actual credentials
 * for real testing.
 */
function testLogin() {
  // IMPORTANT: Replace with valid credentials for actual testing,
  // or ideally, prompt the user for their credentials in a more secure way.
  loginToConquerClub("testuser", "testpass");
}

/**
 * Helper function to ensure there's an active spreadsheet and sheet.
 * This is useful if the script might be run from a context where there isn't one.
 * For this specific problem, assuming it's bound to a sheet, but good practice.
 */
function ensureSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    // If no spreadsheet is active, try to open one by ID or create one.
    // This part is more complex and context-dependent.
    // For now, we'll just log.
    console.warn("No active spreadsheet. Please open or create a spreadsheet.");
    return null;
  }
  var sheet = ss.getActiveSheet();
  // You could also ensure a specific sheet name exists if needed:
  // var sheet = ss.getSheetByName("Sheet1");
  // if (!sheet) {
  //   sheet = ss.insertSheet("Sheet1");
  // }
  return sheet;
}
