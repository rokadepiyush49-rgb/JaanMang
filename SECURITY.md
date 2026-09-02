# Secrets handling

## The rule

The Flutter app holds **no server-side credential**. Not the Gemini key, not a
service account, not a privileged Maps key. Anything that can be extracted from
an APK is treated as public, because it is.

## Where each secret lives

| Secret | Home | Reaches the app as |
|---|---|---|
| Gemini API key | Secret Manager, bound to `analyzeReport` | never — the client calls the callable |
| Firebase service account | Cloud Functions runtime identity | never |
| Google Maps SDK key | Android manifest / iOS plist, **restricted** by package name + SHA-1 and by API | a platform-restricted client key |
| Firebase client config | `firebase_options.dart` (gitignored) | public by design; Security Rules do the enforcing |

## Setting the Gemini key

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Nothing is echoed back and nothing is written to the repository. Rotate with the
same command; redeploy the functions afterwards.

## Why `firebase_options.dart` is gitignored

Firebase client config is not secret — Google documents it as safe to ship. It
is excluded anyway so a fork or a CI job cannot silently write to the production
project. Regenerate it per environment:

```bash
flutterfire configure --project=<your-project-id>
```

## What enforces access

Security Rules, not the client. `firebase/firestore.rules` blocks client writes
to `rank`, `priorityScore`, `scoreBreakdown`, `clusterId`, `supporterCount`,
`status` and `code`. A citizen can author their own report and correct its text;
they cannot move it up the queue, fund it, or mark it verified. Those paths run
only through Cloud Functions with admin credentials.

App Check is enforced on both callables so the functions are not an open Gemini
proxy.

## MCP credentials

The Stitch MCP key used to read the designs is a developer-machine credential.
It lives in the MCP client configuration, never in this repository, never in
Dart source, and never in a build artefact.
