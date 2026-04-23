#!/bin/bash
set -euo pipefail

# Load env
source /Users/devrev/devrev-portal/.env.local

API="https://api.dev.devrev-eng.ai"
PAT="$DEVREV_PAT"

# Create session token for rev user
echo "=== Creating session token for rev user ==="
SESSION_RESP=$(curl -s -X POST "$API/auth-tokens.create" \
  -H "Authorization: Bearer $DEVREV_AAT" \
  -H "Content-Type: application/json" \
  -d '{"rev_info": {"user_ref": "meghesh.toshaniwal+newbie@devrev.ai"}}')

SESSION_TOKEN=$(echo "$SESSION_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Session token created."

# Helper: upload tiptap JSON as artifact, return "ARTIFACT_ID S3_VERSION_ID"
upload_artifact() {
  local content_file="$1"

  # Prepare artifact
  PREP=$(curl -s -X POST "$API/internal/artifacts.prepare" \
    -H "Authorization: Bearer $PAT" \
    -H "Content-Type: application/json" \
    -d '{"file_name": "Article", "file_type": "devrev/rt"}')

  ARTIFACT_ID=$(echo "$PREP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  UPLOAD_URL=$(echo "$PREP" | python3 -c "import sys,json; print(json.load(sys.stdin)['url'])")

  # Build form data for upload
  FORM_ARGS=()
  while IFS= read -r line; do
    key=$(echo "$line" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key'])")
    value=$(echo "$line" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['value'])")
    FORM_ARGS+=(-F "${key}=${value}")
  done < <(echo "$PREP" | python3 -c "import sys,json; [print(json.dumps(f)) for f in json.load(sys.stdin)['form_data']]")

  # Upload file with -i to capture S3 version ID from response headers
  UPLOAD_RESP=$(curl -s -i -X POST "$UPLOAD_URL" "${FORM_ARGS[@]}" -F "file=@${content_file}")
  S3_VERSION=$(echo "$UPLOAD_RESP" | grep -i "x-amz-version-id" | awk '{print $2}' | tr -d '\r\n')

  echo "$ARTIFACT_ID $S3_VERSION"
}

# Helper: create article (draft, then publish)
create_article() {
  local title="$1"
  local description="$2"
  local content_file="$3"

  echo "  Uploading artifact for: $title"
  UPLOAD_RESULT=$(upload_artifact "$content_file")
  ARTIFACT_ID=$(echo "$UPLOAD_RESULT" | awk '{print $1}')
  S3_VERSION=$(echo "$UPLOAD_RESULT" | awk '{print $2}')

  echo "  Creating article (draft): $title (artifact: $ARTIFACT_ID, version: $S3_VERSION)"
  RESULT=$(curl -s -X POST "$API/internal/articles.create" \
    -H "Authorization: Bearer $PAT" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"$title\",
      \"description\": \"$description\",
      \"owned_by\": [\"DEVU-1\"],
      \"resource\": {\"artifacts\": [\"$ARTIFACT_ID\"]},
      \"status\": \"draft\",
      \"language\": \"en-US\",
      \"content_format\": \"rt\"
    }")

  ARTICLE_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('article',{}).get('id','FAILED'))" 2>/dev/null || echo "FAILED")

  if [ "$ARTICLE_ID" = "FAILED" ]; then
    echo "  ERROR creating: $(echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT")"
    return
  fi

  # Publish with S3 version ID as published_version
  PUB_RESULT=$(curl -s -X POST "$API/internal/articles.update" \
    -H "Authorization: Bearer $PAT" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"$ARTICLE_ID\", \"status\": \"published\", \"published_version\": \"$S3_VERSION\"}")

  PUB_STATUS=$(echo "$PUB_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('article',{}).get('status','FAILED'))" 2>/dev/null || echo "FAILED")
  echo "  -> Article ID: $ARTICLE_ID [status: $PUB_STATUS]"

  if [ "$PUB_STATUS" = "FAILED" ]; then
    echo "  ERROR publishing: $(echo "$PUB_RESULT" | python3 -m json.tool 2>/dev/null || echo "$PUB_RESULT")"
  fi
}

TMPDIR=$(mktemp -d)

echo ""
echo "=== Creating Articles ==="

# Article A — Setting up SSO with SAML
cat > "$TMPDIR/article_a.json" << 'JSONEOF'
{
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Overview"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Single Sign-On (SSO) allows your team to authenticate using your organization's identity provider (IdP). This guide covers setting up "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "SAML 2.0"},
      {"type": "text", "text": " based SSO, which is the most widely supported enterprise authentication protocol. By configuring SAML SSO, your users can log in with their existing corporate credentials, eliminating the need for separate passwords and improving security posture across your organization."}
    ]},
    {"type": "calloutBlockNode", "attrs": {"backgroundColor": "background_info", "textColor": "text_neutral"}, "content": [
      {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Tip: Before starting, make sure you have admin access to both your IdP (Okta, Azure AD, OneLogin, etc.) and your application's admin console. You'll need to switch between these two systems during setup."}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Prerequisites"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Before configuring SAML SSO, ensure you have the following ready:"}]},
    {"type": "bulletList", "attrs": {"tight": true}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Administrator access to your identity provider (Okta, Azure AD, OneLogin, PingFederate, or ADFS)"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Organization admin role in your application account"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "A verified domain (e.g., yourcompany.com) added in Settings > Domains"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "An SSL/TLS certificate if your IdP requires signed requests"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Access to your IdP's metadata XML file or its URL"}]}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Step-by-Step Configuration"}]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "Step 1: Enable SSO in Your Account"}]},
    {"type": "orderedList", "attrs": {"start": 1, "tight": true}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Navigate to Settings > Authentication > Single Sign-On."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Click \"Enable SSO\" and select SAML 2.0 as the protocol."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Copy the ACS (Assertion Consumer Service) URL and Entity ID shown on the screen — you'll need these for your IdP."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Download the SP (Service Provider) metadata XML file if your IdP supports metadata import."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Note the default relay state URL if you want users to land on a specific page after login."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Keep this tab open — you'll return here after configuring your IdP to paste their metadata."}]}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "Step 2: Configure Your Identity Provider"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "In your IdP's admin console, create a new SAML application. Use the ACS URL and Entity ID you copied above. Set the "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "Name ID format"},
      {"type": "text", "text": " to "},
      {"type": "text", "marks": [{"type": "italic"}], "text": "emailAddress"},
      {"type": "text", "text": " and map the user's email attribute. Here's a sample SAML configuration XML:"}
    ]},
    {"type": "codeBlock", "attrs": {"language": "xml"}, "content": [{"type": "text", "text": "<md:EntityDescriptor xmlns:md=\"urn:oasis:names:tc:SAML:2.0:metadata\"\n    entityID=\"https://idp.yourcompany.com/saml/metadata\">\n  <md:IDPSSODescriptor\n      protocolSupportEnumeration=\"urn:oasis:names:tc:SAML:2.0:protocol\">\n    <md:KeyDescriptor use=\"signing\">\n      <ds:KeyInfo xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\">\n        <ds:X509Data>\n          <ds:X509Certificate>MIICzDCCAbSgAwIBAgI...</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </md:KeyDescriptor>\n    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>\n    <md:SingleSignOnService\n        Binding=\"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect\"\n        Location=\"https://idp.yourcompany.com/saml/sso\"/>\n  </md:IDPSSODescriptor>\n</md:EntityDescriptor>"}]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "Step 3: Upload IdP Metadata"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Return to your application's SSO settings page. You can either upload the IdP metadata XML file directly, or paste the individual values: "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "IdP SSO URL"},
      {"type": "text", "text": ", "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "IdP Issuer/Entity ID"},
      {"type": "text", "text": ", and the "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "X.509 Certificate"},
      {"type": "text", "text": "."}
    ]},
    {"type": "calloutBlockNode", "attrs": {"backgroundColor": "background_warning", "textColor": "text_neutral"}, "content": [
      {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Warning: When updating your IdP certificate (e.g., during annual rotation), always upload the new certificate BEFORE removing the old one from the IdP. Otherwise, existing sessions will break and users will be locked out. We recommend a 24-hour overlap period."}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Attribute Mapping"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "SAML attribute mapping tells the application how to interpret user data from your IdP. The following attributes are required:"}]},
    {"type": "table", "content": [
      {"type": "tableRow", "content": [
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Application Attribute"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "SAML Attribute"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Required"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Email"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "NameID or email"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "First Name"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "firstName or givenName"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Last Name"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "lastName or surname"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Groups"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "memberOf or groups"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No (recommended)"}]}]}
      ]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Testing the Connection"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "After completing the configuration, test the SSO connection before enforcing it for all users. Click the "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "\"Test Connection\""},
      {"type": "text", "text": " button. This will open a new browser window and attempt to authenticate via your IdP. If successful, you'll see a confirmation with the mapped attributes. If it fails, check the SAML response in your browser's developer tools under the Network tab."}
    ]},
    {"type": "blockquote", "content": [
      {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Pro tip: Use a SAML tracer browser extension (available for Chrome and Firefox) to inspect the raw SAML assertion during troubleshooting. This makes it much easier to spot attribute mapping issues or certificate problems."}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Troubleshooting Common Issues"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Here are the most frequently encountered issues when setting up SAML SSO:"}]},
    {"type": "bulletList", "attrs": {"tight": false}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [
        {"type": "text", "marks": [{"type": "bold"}], "text": "\"Invalid SAML Response\" error"},
        {"type": "text", "text": ": This usually means the ACS URL in your IdP doesn't match what's configured in the application. Double-check both values are identical, including the protocol (https://)."}
      ]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [
        {"type": "text", "marks": [{"type": "bold"}], "text": "\"Certificate mismatch\" error"},
        {"type": "text", "text": ": The X.509 certificate uploaded doesn't match the one your IdP uses to sign assertions. Re-download the certificate from your IdP and re-upload it."}
      ]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [
        {"type": "text", "marks": [{"type": "bold"}], "text": "\"User not found\" after successful authentication"},
        {"type": "text", "text": ": The email in the SAML assertion doesn't match any user in the application. Ensure the NameID format is set to emailAddress and the email domain matches your verified domain."}
      ]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [
        {"type": "text", "marks": [{"type": "bold"}], "text": "Clock skew errors"},
        {"type": "text", "text": ": SAML assertions have a validity window (usually 5 minutes). If your IdP server's clock is significantly out of sync, assertions will be rejected. Ensure NTP is configured on your IdP."}
      ]}]}
    ]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "For additional help, visit our "},
      {"type": "text", "marks": [{"type": "link", "attrs": {"href": "https://example.com/sso-troubleshooting"}}], "text": "SSO troubleshooting guide"},
      {"type": "text", "text": " or contact our support team."}
    ]}
  ]
}
JSONEOF

create_article "Setting up SSO with SAML" "Complete guide to configuring SAML-based Single Sign-On with your identity provider" "$TMPDIR/article_a.json"

# Article B — Troubleshooting failed payments
cat > "$TMPDIR/article_b.json" << 'JSONEOF'
{
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Common Payment Error Codes"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "When a payment fails, the system returns a specific error code that helps identify the root cause. Below is a comprehensive list of the most common error codes, their meanings, and recommended fixes. Always check the error code "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "before"},
      {"type": "text", "text": " contacting support, as most issues can be resolved with the steps below."}
    ]},
    {"type": "calloutBlockNode", "attrs": {"backgroundColor": "background_error", "textColor": "text_neutral"}, "content": [
      {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Critical: If you see error code PMT-5000 or PMT-5001, stop all payment attempts immediately. These indicate a potential fraud detection flag on your account. Contact support@example.com within 24 hours to resolve."}]}
    ]},
    {"type": "table", "content": [
      {"type": "tableRow", "content": [
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Error Code"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Meaning"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Fix"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "PMT-4001"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Insufficient funds in source account"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Verify account balance and retry"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "PMT-4010"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Invalid recipient bank details"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Double-check routing and account numbers"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "PMT-4022"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Payment exceeds daily transaction limit"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Request limit increase or split into multiple payments"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "PMT-4030"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Currency mismatch between accounts"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Enable multi-currency or use matching currency"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "PMT-4040"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Duplicate payment detected"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Check if original payment went through before retrying"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "PMT-5000"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Fraud detection — account flagged"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Contact support immediately"}]}]}
      ]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Step-by-Step Resolution Guide"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Follow these steps to resolve most payment failures:"}]},
    {"type": "orderedList", "attrs": {"start": 1, "tight": false}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [
        {"type": "text", "marks": [{"type": "bold"}], "text": "Check the error code"},
        {"type": "text", "text": ": Go to Payments > Failed Transactions and note the exact error code from the table above."}
      ]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [
        {"type": "text", "marks": [{"type": "bold"}], "text": "Verify payment details"},
        {"type": "text", "text": ": Confirm the recipient's bank details, amount, and currency are correct. Small typos in account numbers are the #1 cause of PMT-4010 errors."}
      ]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [
        {"type": "text", "marks": [{"type": "bold"}], "text": "Check your limits"},
        {"type": "text", "text": ": Navigate to Settings > Payment Limits to see your current daily and per-transaction limits. If the payment exceeds these, request an increase or split the payment."}
      ]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [
        {"type": "text", "marks": [{"type": "bold"}], "text": "Retry the payment"},
        {"type": "text", "text": ": After fixing the issue, retry from the failed transaction page. Do not create a new payment, as this may trigger duplicate detection."}
      ]}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Requesting a Limit Increase"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "If your payment was blocked due to a transaction limit (PMT-4022), you can request a temporary or permanent limit increase. Go to "},
      {"type": "text", "marks": [{"type": "italic"}], "text": "Settings > Payment Limits > Request Increase"},
      {"type": "text", "text": ". Temporary increases are approved within 2 hours during business hours. Permanent increases require manager approval and take 1-2 business days."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "When to Contact Support"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Contact our support team if you encounter any of the following situations:"}]},
    {"type": "bulletList", "attrs": {"tight": true}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Error codes starting with PMT-5xxx (server-side or fraud-related)"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Payment stuck in \"processing\" for more than 4 hours"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Incorrect amount debited from your account"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Repeated failures despite correct payment details"}]}]}
    ]}
  ]
}
JSONEOF

create_article "Troubleshooting failed payments" "Guide to resolving common payment errors including error codes, resolution steps, and limit increases" "$TMPDIR/article_b.json"

# Article C — Managing user roles and permissions
cat > "$TMPDIR/article_c.json" << 'JSONEOF'
{
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Understanding Roles"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Roles define what actions a user can perform within the platform. Each user is assigned exactly one role, which determines their access level. Roles are hierarchical — higher roles inherit all permissions from lower roles. Understanding this hierarchy is essential before making any role assignments."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "Viewer Role"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Viewers have read-only access. They can view dashboards, reports, and data but cannot create, edit, or delete any resources. This role is ideal for stakeholders who need visibility without modification rights. Viewers can export data to CSV and PDF formats, and can set up personal dashboard views."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "Editor Role"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Editors can create and modify resources within their assigned workspace. They cannot delete resources, manage users, or change system settings. Editors can also create and share reports. This is the default role for most team members who need to contribute content."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "Manager Role"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Managers have full CRUD (create, read, update, delete) access within their workspace. They can also manage team members within their workspace — inviting users, assigning roles, and removing access. Managers cannot access organization-wide settings or billing."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "Admin Role"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Admins have full access to everything, including organization settings, billing, SSO configuration, API key management, and audit logs. Admin access should be limited to as few people as necessary."}
    ]},
    {"type": "calloutBlockNode", "attrs": {"backgroundColor": "background_warning", "textColor": "text_neutral"}, "content": [
      {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Admin-only action: Changing a user's role to Admin requires an existing Admin. For security, this action is logged in the audit trail and triggers an email notification to all other Admins."}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Permission Matrix"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "The following table shows which permissions are available for each role:"}]},
    {"type": "table", "content": [
      {"type": "tableRow", "content": [
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Permission"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Viewer"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Editor"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Manager"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Admin"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "View resources"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Create/edit resources"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Delete resources"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Manage team members"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Organization settings"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Billing & invoices"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "No"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Yes"}]}]}
      ]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "How to Change a User's Role"}]},
    {"type": "orderedList", "attrs": {"start": 1, "tight": true}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Navigate to Settings > Team Members."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Find the user by name or email."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Click the role dropdown next to their name."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Select the new role and click Save."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "The user will receive an email notification about the role change."}]}]}
    ]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "For more information about workspace access controls, visit our "},
      {"type": "text", "marks": [{"type": "link", "attrs": {"href": "https://example.com/access-controls"}}], "text": "access control documentation"},
      {"type": "text", "text": "."}
    ]}
  ]
}
JSONEOF

create_article "Managing user roles and permissions" "Overview of user roles (Viewer, Editor, Manager, Admin), permission matrix, and how to manage role assignments" "$TMPDIR/article_c.json"

# Article D — Billing FAQ (short)
cat > "$TMPDIR/article_d.json" << 'JSONEOF'
{
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "How do I view my current subscription plan?"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Go to "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "Settings > Billing > Subscription"},
      {"type": "text", "text": " to see your current plan, usage, and next billing date. You can also download past invoices from this page. Each invoice includes a detailed breakdown of charges by workspace and user count."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "Can I switch from monthly to annual billing?"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Yes. Annual billing saves you 20% compared to monthly billing. Navigate to "},
      {"type": "text", "marks": [{"type": "italic"}], "text": "Settings > Billing > Change Plan"},
      {"type": "text", "text": " and select the annual option. The switch takes effect at the start of your next billing cycle. Your remaining monthly balance will be prorated and applied as a credit toward the annual payment. You'll receive a confirmation email with the exact amounts."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "What happens if my payment fails?"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "If a payment fails, we'll retry automatically after 3 days, then again after 7 days. You'll receive email notifications for each failed attempt. If payment is still not received after 14 days, your account will be downgraded to the free tier. All your data is preserved for 90 days, so you can reactivate at any time by updating your payment method and settling the outstanding balance."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 3}, "content": [{"type": "text", "text": "How do I update my payment method?"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Go to Settings > Billing > Payment Methods. You can add a new credit card, debit card, or bank account. We also accept wire transfers for annual plans over $10,000. If you need to pay by purchase order, contact our sales team."}
    ]}
  ]
}
JSONEOF

create_article "Billing FAQ" "Frequently asked questions about subscription plans, payment methods, billing cycles, and invoices" "$TMPDIR/article_d.json"

# Article E — API Integration Guide (long, technical)
cat > "$TMPDIR/article_e.json" << 'JSONEOF'
{
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Getting Started"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Our REST API allows you to programmatically interact with all platform resources. This guide covers authentication, common endpoints, rate limits, error handling, and best practices for building robust integrations. All API endpoints use JSON for request and response bodies, and return standard HTTP status codes."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Authentication"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "All API requests require authentication via a Bearer token in the "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "Authorization"},
      {"type": "text", "text": " header. You can generate API keys from "},
      {"type": "text", "marks": [{"type": "italic"}], "text": "Settings > API Keys"},
      {"type": "text", "text": ". Each key has configurable scopes that limit what operations it can perform."}
    ]},
    {"type": "codeBlock", "attrs": {"language": "bash"}, "content": [{"type": "text", "text": "curl -X GET https://api.example.com/v2/users \\\n  -H \"Authorization: Bearer sk_live_abc123def456\" \\\n  -H \"Content-Type: application/json\""}]},
    {"type": "calloutBlockNode", "attrs": {"backgroundColor": "background_warning", "textColor": "text_neutral"}, "content": [
      {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Never expose API keys in client-side code or public repositories. Use environment variables and server-side proxies. Rotate keys immediately if you suspect they've been compromised."}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Core Endpoints"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "The following table lists the most commonly used API endpoints:"}]},
    {"type": "table", "content": [
      {"type": "tableRow", "content": [
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Method"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Endpoint"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Description"}]}]},
        {"type": "tableHeader", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Scope Required"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "GET"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "/v2/users"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "List all users"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "users:read"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "POST"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "/v2/users"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Create a user"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "users:write"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "GET"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "/v2/transactions"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "List transactions"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "transactions:read"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "POST"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "/v2/payments"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Initiate payment"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "payments:write"}]}]}
      ]},
      {"type": "tableRow", "content": [
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "GET"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "/v2/webhooks"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "List webhooks"}]}]},
        {"type": "tableCell", "attrs": {"colspan": 1, "rowspan": 1}, "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "webhooks:read"}]}]}
      ]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Rate Limits"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "API requests are rate-limited to protect service stability. The default limits are "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "100 requests per minute"},
      {"type": "text", "text": " for standard plans and "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "1,000 requests per minute"},
      {"type": "text", "text": " for enterprise plans. When you hit the rate limit, the API returns HTTP 429 with a "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "Retry-After"},
      {"type": "text", "text": " header indicating how many seconds to wait."}
    ]},
    {"type": "codeBlock", "attrs": {"language": "javascript"}, "content": [{"type": "text", "text": "// Implementing exponential backoff for rate limits\nasync function apiCallWithRetry(url, options, maxRetries = 3) {\n  for (let attempt = 0; attempt < maxRetries; attempt++) {\n    const response = await fetch(url, options);\n    \n    if (response.status === 429) {\n      const retryAfter = parseInt(response.headers.get('Retry-After') || '5');\n      const backoff = retryAfter * Math.pow(2, attempt);\n      console.log(`Rate limited. Retrying in ${backoff}s...`);\n      await new Promise(resolve => setTimeout(resolve, backoff * 1000));\n      continue;\n    }\n    \n    return response;\n  }\n  throw new Error('Max retries exceeded');\n}"}]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Pagination"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "All list endpoints support cursor-based pagination. The response includes a "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "next_cursor"},
      {"type": "text", "text": " field when more results are available. Pass this value as the "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "cursor"},
      {"type": "text", "text": " query parameter in your next request. The default page size is 25 items; you can request up to 100 using the "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "limit"},
      {"type": "text", "text": " parameter."}
    ]},
    {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "import requests\n\ndef fetch_all_users(api_key):\n    \"\"\"Fetch all users using cursor-based pagination.\"\"\"\n    users = []\n    cursor = None\n    \n    while True:\n        params = {'limit': 100}\n        if cursor:\n            params['cursor'] = cursor\n        \n        response = requests.get(\n            'https://api.example.com/v2/users',\n            headers={'Authorization': f'Bearer {api_key}'},\n            params=params\n        )\n        data = response.json()\n        users.extend(data['items'])\n        \n        cursor = data.get('next_cursor')\n        if not cursor:\n            break\n    \n    return users"}]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Error Handling"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "The API uses standard HTTP status codes. All error responses include a JSON body with an error code and a human-readable message:"}]},
    {"type": "codeBlock", "attrs": {"language": "json"}, "content": [{"type": "text", "text": "{\n  \"error\": {\n    \"code\": \"invalid_parameter\",\n    \"message\": \"The 'email' field must be a valid email address\",\n    \"param\": \"email\",\n    \"request_id\": \"req_abc123\"\n  }\n}"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Always include the "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "request_id"},
      {"type": "text", "text": " when contacting support about API errors. This allows our team to quickly trace the issue in our logs."}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Webhooks"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Webhooks allow you to receive real-time notifications when events occur. Configure webhook endpoints in "},
      {"type": "text", "marks": [{"type": "italic"}], "text": "Settings > API > Webhooks"},
      {"type": "text", "text": ". Each webhook delivery includes a signature in the "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "X-Signature-256"},
      {"type": "text", "text": " header that you should verify to ensure authenticity."}
    ]},
    {"type": "codeBlock", "attrs": {"language": "javascript"}, "content": [{"type": "text", "text": "const crypto = require('crypto');\n\nfunction verifyWebhookSignature(payload, signature, secret) {\n  const expected = crypto\n    .createHmac('sha256', secret)\n    .update(payload)\n    .digest('hex');\n  return crypto.timingSafeEqual(\n    Buffer.from(signature),\n    Buffer.from(`sha256=${expected}`)\n  );\n}"}]}
  ]
}
JSONEOF

create_article "API Integration Guide" "Complete technical guide for API authentication, endpoints, rate limits, pagination, error handling, and webhooks" "$TMPDIR/article_e.json"

# Article F — Account security best practices
cat > "$TMPDIR/article_f.json" << 'JSONEOF'
{
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Enable Multi-Factor Authentication"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Multi-factor authentication (MFA) adds a critical second layer of security beyond your password. We strongly recommend enabling MFA for all users, especially those with admin or manager roles. MFA is available via authenticator apps (Google Authenticator, Authy, 1Password), hardware security keys (YubiKey, Titan), and SMS (not recommended for high-security accounts)."}
    ]},
    {"type": "calloutBlockNode", "attrs": {"backgroundColor": "background_error", "textColor": "text_neutral"}, "content": [
      {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Critical: If you suspect your account has been compromised, immediately change your password and enable MFA. Then go to Settings > Security > Active Sessions and click \"Revoke All Sessions\" to force logout on all devices. Contact support if you see unrecognized activity in your audit log."}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Password Requirements"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Strong passwords are your first line of defense. Our platform enforces the following password requirements:"}]},
    {"type": "bulletList", "attrs": {"tight": true}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Minimum 12 characters"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "At least one uppercase letter, one lowercase letter, and one number"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Cannot reuse any of your last 10 passwords"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Password expires every 90 days (configurable by admin)"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Account locks after 5 consecutive failed login attempts"}]}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Monitor Login Activity"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [
      {"type": "text", "text": "Regularly review your login history to spot unauthorized access. Go to "},
      {"type": "text", "marks": [{"type": "bold"}], "text": "Settings > Security > Login History"},
      {"type": "text", "text": " to see all recent sign-ins, including the IP address, location, device type, and browser. Suspicious login attempts from unfamiliar locations or devices should be investigated immediately."}
    ]},
    {"type": "calloutBlockNode", "attrs": {"backgroundColor": "background_info", "textColor": "text_neutral"}, "content": [
      {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Tip: Enable email notifications for new device logins. Go to Settings > Notifications > Security and turn on \"Alert on new device login\". You'll receive an email each time your account is accessed from an unrecognized device."}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "API Key Security"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "API keys grant programmatic access to your account. Follow these best practices to keep them secure:"}]},
    {"type": "orderedList", "attrs": {"start": 1, "tight": true}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Use the minimum required scopes for each API key — never grant full access unless absolutely necessary."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Rotate API keys every 90 days using the key rotation feature in Settings > API Keys."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Store keys in environment variables or a secrets manager — never hardcode them in source code."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Set IP allowlists for production API keys to restrict where they can be used from."}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Immediately revoke any key you suspect has been exposed."}]}]}
    ]},
    {"type": "heading", "attrs": {"textAlign": null, "level": 2}, "content": [{"type": "text", "text": "Security Checklist"}]},
    {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Use this checklist to ensure your account is properly secured:"}]},
    {"type": "bulletList", "attrs": {"tight": true}, "content": [
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "MFA enabled for all admin users"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "SSO configured (if available on your plan)"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Password policy set to organization requirements"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Login activity notifications enabled"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "API keys scoped and rotated regularly"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Unused user accounts deactivated"}]}]},
      {"type": "listItem", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "Audit log reviewed monthly"}]}]}
    ]}
  ]
}
JSONEOF

create_article "Account security best practices" "Security checklist covering MFA, password policies, login monitoring, API key management, and incident response" "$TMPDIR/article_f.json"

echo ""
echo "=== Creating Tickets ==="

REV_USER_ID="don:identity:dvrv-us-1:devo/1JpSJovlTT:revu/EBBFFT0R"

create_ticket() {
  local title="$1"
  local body="$2"

  RESULT=$(curl -s -X POST "$API/internal/works.create" \
    -H "Authorization: Bearer $PAT" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"ticket\", \"title\": \"$title\", \"body\": \"$body\", \"applies_to_part\": \"don:core:dvrv-us-1:devo/1JpSJovlTT:product/1\", \"reported_by\": [\"$REV_USER_ID\"]}")

  TICKET_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('work',{}).get('id','FAILED'))" 2>/dev/null || echo "FAILED")
  echo "  Ticket: $title -> $TICKET_ID"

  if [ "$TICKET_ID" = "FAILED" ]; then
    echo "  ERROR: $(echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT")"
  fi
}

create_ticket "SSO login failing with SAML error" "Getting SAML assertion error when trying to SSO login. Error: Invalid SAML response. Started happening after we updated our IdP certificate. We're using Okta as our identity provider and the login worked fine until the certificate rotation last week. Now all SSO users are locked out and we had to temporarily switch to password-based auth."

create_ticket "Payment to vendor failed — error code PMT-4022" "Attempted to pay vendor ABC Corp but got error PMT-4022. The payment amount was \$12,500. Need this resolved before end of month. This is a recurring monthly payment that has been working fine for the past 6 months. The vendor is asking us about the delayed payment."

create_ticket "Account potentially compromised — suspicious login activity" "We noticed login attempts from IP addresses in a country we don't operate in (appears to be from Eastern Europe). There were 12 failed login attempts followed by one successful login at 3am local time. Need help reviewing access logs and securing the account. The affected account belongs to our finance director."

create_ticket "Need to add a new admin user" "We hired a new finance director who needs admin access to manage approvals and user permissions. Her name is Sarah Chen (sarah.chen@company.com). She needs to be able to manage team members in the Finance workspace and have access to billing. Please advise on the best role to assign and the steps to set this up."

create_ticket "API rate limits — getting 429 errors" "Our integration is hitting rate limits during peak sync hours (9am-11am EST). Getting HTTP 429 responses on roughly 15%% of requests. We're syncing about 5,000 records every 30 minutes. Need to understand the current limits for our plan and best practices for handling rate limits. Currently on the Professional plan."

echo ""
echo "=== Creating Conversations ==="

create_conversation() {
  local title="$1"
  local description="$2"
  local message="$3"

  RESULT=$(curl -s -X POST "$API/internal/conversations.create" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"support\", \"title\": \"$title\", \"description\": \"$description\"}")

  CONV_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('conversation',{}).get('id','FAILED'))" 2>/dev/null || echo "FAILED")
  echo "  Conversation: $title -> $CONV_ID"

  if [ "$CONV_ID" = "FAILED" ]; then
    echo "  ERROR: $(echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT")"
    return
  fi

  # Post a timeline comment
  COMMENT_RESULT=$(curl -s -X POST "$API/internal/timeline-entries.create" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"timeline_comment\", \"object\": \"$CONV_ID\", \"body\": \"$message\", \"visibility\": \"external\"}")

  COMMENT_ID=$(echo "$COMMENT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('timeline_entry',{}).get('id','FAILED'))" 2>/dev/null || echo "FAILED")
  echo "  -> Comment: $COMMENT_ID"

  if [ "$COMMENT_ID" = "FAILED" ]; then
    echo "  COMMENT ERROR: $(echo "$COMMENT_RESULT" | python3 -m json.tool 2>/dev/null || echo "$COMMENT_RESULT")"
  fi
}

create_conversation \
  "How do I export my transaction history?" \
  "I need to export all transactions from Q1 2026 for our annual audit." \
  "Hi, I need to export our complete transaction history for Q1 2026 (January through March). Our auditors need it in CSV format with all transaction details including timestamps, amounts, counterparties, and status. Is there a way to do a bulk export or do I need to download month by month?"

create_conversation \
  "Question about upgrading our plan" \
  "We are considering upgrading from Professional to Enterprise." \
  "Hi team, we are growing fast and considering upgrading from the Professional plan to Enterprise. Can you help me understand what additional features we would get? Specifically interested in SSO support, advanced API limits, and dedicated support. Also, is there a way to do a trial of the Enterprise plan before committing to an annual contract?"

echo ""
echo "=== Verification ==="

echo ""
echo "--- Articles ---"
curl -s -X POST "$API/internal/articles.list" \
  -H "Authorization: Bearer $PAT" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -c "
import sys, json
data = json.load(sys.stdin)
articles = data.get('articles', [])
print(f'Total articles: {len(articles)}')
for a in articles:
    print(f'  {a[\"id\"]} — {a.get(\"title\",\"(no title)\")} [{a.get(\"status\",\"?\")}]')
"

echo ""
echo "--- Tickets ---"
curl -s -X POST "$API/internal/works.list" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": ["ticket"]}' | python3 -c "
import sys, json
data = json.load(sys.stdin)
works = data.get('works', [])
print(f'Total tickets: {len(works)}')
for w in works:
    print(f'  {w[\"id\"]} — {w.get(\"title\",\"(no title)\")}')
"

echo ""
echo "--- Conversations ---"
curl -s -X POST "$API/internal/conversations.list" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -c "
import sys, json
data = json.load(sys.stdin)
convos = data.get('conversations', [])
print(f'Total conversations: {len(convos)}')
for c in convos:
    print(f'  {c[\"id\"]} — {c.get(\"title\",\"(no title)\")}')
"

# Cleanup
rm -rf "$TMPDIR"

echo ""
echo "=== Done! ==="
