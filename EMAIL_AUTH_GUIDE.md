# Email OTP Verification & Password Reset

Signup now requires confirming the email address with a 6-digit code, and users
who forget their password can reset it with a code instead of contacting you.

## 1. Setup (5 minutes)

```bash
cd backend
npm install          # pulls in nodemailer
```

Generate a Gmail App Password (a regular account password will be rejected by
Gmail's SMTP server):

1. The Google account needs **2-Step Verification** turned on.
2. Go to https://myaccount.google.com/apppasswords
3. Create one named e.g. `wardrobe-manager`, copy the 16-character value.

Add it to `backend/.env`:

```env
SMTP_USER=prahlad.singh.dev@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_FROM_NAME=Wardrobe Manager
```

Spaces are stripped automatically, so pasting `abcd efgh ijkl mnop` works too.

On boot the server verifies the credentials and logs `✉️  SMTP ready (...)`.
If they're wrong you'll see the failure in the logs immediately rather than on
the first signup.

**Without SMTP configured** the API still runs — in development it prints each
code to the terminal so you can test the flow offline. In production
(`NODE_ENV=production`) a missing config makes signup fail loudly instead of
silently swallowing codes.

## 2. What changed

### Backend

| File | Change |
|---|---|
| `models/User.js` | new `emailVerified` boolean (default `false`) |
| `models/EmailToken.js` | **new** — bcrypt-hashed codes with a Mongo TTL index |
| `utils/mailer.js` | **new** — nodemailer Gmail transport + HTML email templates |
| `controllers/authController.js` | `register` / `login` rewritten, 4 new handlers |
| `routes/authRoutes.js` | 4 new routes |
| `server.js` | verifies SMTP at boot (non-blocking) |
| `seed.js` | demo user is created pre-verified |

### New endpoints

| Method | Route | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/register` | `name, email, password` | `{ requiresVerification: true, email }` — **no token** |
| POST | `/api/auth/verify-email` | `email, code` | `{ token, user }` |
| POST | `/api/auth/resend-code` | `email, purpose` (`verify`\|`reset`) | `{ message }` |
| POST | `/api/auth/forgot-password` | `email` | `{ message }` (always 200) |
| POST | `/api/auth/reset-password` | `email, code, password` | `{ token, user }` |

`POST /api/auth/login` now returns **403** with `{ requiresVerification: true, email }`
when the password is right but the address is unverified — and quietly re-sends
a code so the user doesn't have to tap Resend.

### Frontend

| File | Change |
|---|---|
| `components/OtpInput.js` | **new** — 6 boxes over one hidden input (keeps autofill working) |
| `screens/VerifyEmailScreen.js` | **new** — code entry, auto-submits on the 6th digit, 60s resend timer |
| `screens/ForgotPasswordScreen.js` | **new** — enter email |
| `screens/ResetPasswordScreen.js` | **new** — code + new password + confirm |
| `screens/RegisterScreen.js` | pushes to VerifyEmail instead of signing in |
| `screens/LoginScreen.js` | "Forgot password?" link; routes unverified users to VerifyEmail |
| `context/AuthContext.js` | `verifyEmail`, `resendCode`, `forgotPassword`, `resetPassword` |
| `api/client.js` | preserves `status` and `requiresVerification` on rejected requests |
| `navigation/AppNavigator.js` | 3 screens added to the auth stack |

No new npm packages on the frontend.

## 3. Security choices worth knowing

- **Codes are never stored in plaintext** — only a bcrypt hash. A database dump
  doesn't hand over live codes.
- **10-minute expiry**, enforced twice: in the query and by a Mongo TTL index
  that deletes the document.
- **5 wrong guesses burns the code.** A 6-digit code has a million
  possibilities; without a cap, brute force is trivial.
- **60-second resend cooldown** per email+purpose, enforced server-side. The
  client timer is only a UI convenience.
- **Codes are single-use** — the token is deleted the moment it validates, so a
  code can't be replayed.
- **`forgot-password` always returns 200.** Replying differently for unknown
  addresses would let anyone test which emails have accounts.
- **A valid reset code also marks the email verified**, since holding it proves
  inbox control.
- **Unverified signups don't lock an address.** Registering again with the same
  unverified email overwrites the name/password and re-sends — otherwise a typo
  or someone squatting your address would block you permanently.

## 4. Existing users

Everyone already in your database has `emailVerified: false` (schema default)
and will be locked out on next login. Grandfather them in once:

```js
// node backend/scripts/... or just run in mongosh
db.users.updateMany({ emailVerified: { $exists: false } }, { $set: { emailVerified: true } })
```

Run this **before** deploying if the app already has real users.

## 5. Testing checklist

- [ ] Sign up → code arrives → enter it → lands in the app
- [ ] Enter a wrong code 5× → code is burned, Resend issues a new one
- [ ] Tap Resend twice quickly → second tap shows the cooldown
- [ ] Wait 10 min, then submit → "invalid or has expired"
- [ ] Try logging in before verifying → routed to the OTP screen
- [ ] Forgot password → code → new password → signed in automatically
- [ ] Old password no longer works after a reset

## 6. Gmail's sending limits

A free Gmail account allows roughly 500 messages a day and may start marking
bulk automated mail as spam. That's fine for a portfolio app or early users. If
this ever grows, move `utils/mailer.js` to a transactional provider — Resend,
Brevo or SendGrid all have usable free tiers and better deliverability. Only the
transport inside that file needs to change; nothing else imports nodemailer.
