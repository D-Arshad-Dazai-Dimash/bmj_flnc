# Backend Module Notes

## Auth cookies for cross-domain deployment

For Vercel frontend + Fly backend deployments, auth cookies must be configured for cross-site requests:

- `Cookie:Secure=true`
- `Cookie:SameSite=None`

These values are read by `AuthController` when issuing `access_token` and `refresh_token` cookies.

If `Secure=false` (local HTTP development), `SameSite=None` is automatically downgraded to `Lax` to keep browser-compatible behavior.

## CORS

Update `AllowedOrigins` in `backend/Barnamaj.API/appsettings.json` to include all active frontend domains.

Current production examples:

- `https://frontend-fawn-eight-33.vercel.app`
- `https://barnamaj.kz`
- `https://www.barnamaj.kz`
