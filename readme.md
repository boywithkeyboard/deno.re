## Usage

**Want to suggest a new feature or chat with us?** [Join our Discord](https://deno.re/discord)

### Minify Files

When you request a `*.min.js`, `*.min.mjs` or `*.min.jsx` file and the release does not contain such a file, deno.re will automatically minify the file.

```ts
// Since deno-esbuild only comes with a mod.js file, deno.re will minify it for you.
import { build } from 'https://deno.re/esbuild/deno-esbuild@v0.20.0/mod.min.js'
```

### Import Latest Tag

```ts
import { encodeHex } from 'https://deno.re/denoland/deno_std/encoding/hex.ts'
```

### Import Specific Commit

```ts
import { encodeHex } from 'https://deno.re/denoland/deno_std@6cc097b6212eaba083634b0e826c0916a49a3148/encoding/hex.ts'
```

### Import Specific Tag

```ts
import { encodeHex } from 'https://deno.re/denoland/deno_std@0.220.0/encoding/hex.ts'
```

### Omit Entry Point

```ts
import { crypto } from 'https://deno.re/denoland/deno_std@0.221.0/crypto'
// ↓
import { crypto } from 'https://deno.re/denoland/deno_std@0.221.0/crypto/mod.ts'
```

The order of priority for file extensions can be found [here](https://github.com/boywithkeyboard/deno.re/blob/main/registry/get_entry_point.ts#L6).

## Self-Hosting

There are two approaches you can take to deploy your custom instance of deno.re.

You can either

1. use our [Docker image](https://github.com/boywithkeyboard/deno.re/pkgs/container/deno.re)
2. or clone the repository and run `npm ci && npm run build` to build the server

Either way, you need to set the below environment variables in order for the server to work:

- `BASE_URL` *(The base URL for your custom instance, e.g. `https://foo.com`)*
- `S3_HOSTNAME` *(The public hostname of your bucket, e.g. `bar.foo.com`)*
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET` *(The name of your S3 bucket, e.g. `foo`)*
- `S3_ENDPOINT` *(e.g. `https://<id>.eu.r2.cloudflarestorage.com` for Cloudflare R2)*

## Terms of Use

deno.re is designed to be a permanent caching layer for Deno modules stored on GitHub. If you decide to abuse our service in whatever way, we reserve the right to blacklist your GitHub account.

No guarantee of availability is assumed for this service.
