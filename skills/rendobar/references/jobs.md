# Jobs: submit, wait, and collect results

## The live catalog rule

The set of runnable job types is defined by the API, not by this document.
Before choosing a job type:

1. `GET https://api.rendobar.com/jobs/types` (public, no auth) lists every
   live job type.
2. `GET https://api.rendobar.com/jobs/types/{type}/schema` returns the exact
   parameter schema for one type.

Capability families you can expect to find there: FFmpeg processing, media
probing (ffprobe), composition, compression to a target size, caption
animation and burning, image generation, editing, and upscaling, and 3D
models from a photo or a prompt, ready to print or for an app. The
catalog is the truth for what exists today and what each type accepts. Never
submit a type or a parameter the catalog does not list.

## Submit

SDK:

```ts
import { createClient } from "@rendobar/sdk";

const client = createClient({ apiKey: process.env.RENDOBAR_API_KEY });

const job = await client.jobs.create({
  type: "ffprobe",
  params: { command: "https://cdn.rendobar.com/assets/examples/sample.mp4" },
  idempotencyKey: "order-1234-probe", // dedupes retries
});
```

REST:

```bash
curl -X POST https://api.rendobar.com/jobs \
  -H "Authorization: Bearer $RENDOBAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"ffprobe","params":{"command":"https://cdn.rendobar.com/assets/examples/sample.mp4"}}'
```

## Where the media URL goes

This is the single easiest thing to get wrong, because it is not the same for
every type. Read `GET /jobs/types/{type}/schema` before building the body.

| Type | Media URL goes in |
|---|---|
| `ffprobe` | `params.command`, which is a raw ffprobe command whose minimal form is just the URL |
| `ffmpeg` | `params.command`, with `inputs` mapping the filenames used inside that command |
| Everything else | `inputs`, with options in `params` |

Sending the wrong shape is safe but wasted: the API rejects it with
`VALIDATION_ERROR` and a `details` array naming the exact missing path, for
example `path: ["command"]`. Read that path and fix the body.

Rules:

- Media inputs are URLs. For local files, upload through the assets flow
  (`POST https://api.rendobar.com/assets`) first and pass the returned asset
  url as the input.
- Pass an `idempotencyKey` anywhere a retry could double-submit.
- One job produces exactly one output. There is no batch endpoint. To process
  N files, submit N jobs.

## Collect results

Three patterns, in order of preference for production use:

### 1. Webhooks (production servers)

Register an endpoint and receive `job.completed` and `job.failed` events with
signature verification. See [webhooks.md](webhooks.md).

### 2. Per-job callback (one-off delivery, no endpoint registration)

`client.jobs.create` accepts a `callback: { url }` option. On a terminal state
Rendobar POSTs the job envelope to that URL. Set `verify: true` to have the
POST signed with the same HMAC scheme as webhooks.

### 3. Poll or wait (scripts and CLIs)

```ts
const done = await client.jobs.wait(job.id); // polls with backoff, 5 min default timeout
console.log(done.status, done.output);
```

`client.jobs.get(job.id)` is a single status read. On REST, poll
`GET https://api.rendobar.com/jobs/{id}`.

## Reading the output

A completed job carries `output` with four fields:

| Field | Holds |
|---|---|
| `data` | The result when the job returns data rather than a file (`ffprobe`) |
| `file` | The single output file, when the job produces one |
| `files` | Every output file, for jobs that emit more than a reference to one |
| `expiresAt` | When the signed URL in `file` stops working, about an hour |

`output.expiresAt` is the URL's life, not the file's. The file itself is
deleted at `retentionExpiresAt` on the job, which is plan driven (7 days on
free, 30 on pro, 90 on studio). Re-fetch the job for a fresh URL rather than
caching one, and copy anything that must outlive retention into your own
storage.

## 3D models

`3d.generate` and `3d.prepare` take minutes on GPUs and bill on the compute
they use. There is no price before the run: the charge appears on the job.

1. **Purpose first.** For a print, set `printer` (`generic-fdm` or
   `generic-resin` when the user's model is not in the schema). For an app,
   leave it out and pick the format the app reads: `glb` for web and engines,
   `usdz` for Apple AR, `fbx` for Unity and Unreal. Formats cannot change
   after submit.
2. **Ask only what changes the result:** the printer and the real size in mm
   (`sizeMm`, the longest axis). Never invent a size. On `3d.prepare` always
   set it: without it the mesh is scaled to the default, not kept at its own
   size. Leave the rest at its defaults.
3. **Validate, then confirm.** `POST /3d/validate` (MCP `validate_3d`) with
   the exact `inputs` and `params`. Fix each problem by its `code`, then show
   the user the resolved size, printer, formats and quality and get a yes.
   More `candidates`, `quality: "premium"` or a rerun each need a new yes.
4. **Submit once.** After a timeout, read the job's status before
   resubmitting, and pass an `idempotencyKey`.
5. **Fix with `3d.prepare`, do not regenerate.** Another format, size or
   printer, or a repair: pass the finished model's URL as `inputs.mesh`.
6. **One object per job.** Several objects in one photo merge into one lump.

Say so before spending when the job is the wrong tool:

- **It must fit, mate, carry load or match measurements** (a bracket, gear,
  replacement part, enclosure, ring band): generated meshes are not
  dimensionally accurate. Recommend CAD (Fusion, Onshape, OpenSCAD) or a
  text-to-CAD tool.
- **It must match a real product exactly** (a store listing): from one photo
  the back is invented. Ask for back, left and right photos, and for an exact
  copy recommend a phone scan or photogrammetry.
- **It must animate:** the model has no rig. It needs rigging (Mixamo,
  AccuRIG) and often retopology.

For apps, a textured model has at most 40,000 triangles, one material and no
rig or LODs. Set `polycount` lower for a platform budget (a Roblox mesh
allows 20,000, a VRChat Quest avatar 10,000), and always set `sizeMm` to the
real size: AR viewers and engines show the model at that size. Over MCP, the
`list_job_types` guide for the type has settings for each print and app use.

Input that works:

- A photo beats a prompt. Good photos show one object, whole and uncropped,
  on a plain background, in soft even light, from a step back. Glass, chrome
  and printed text come out poorly.
- A prompt names the object first, then its shape, material and style. It
  describes the object, not a photo of it (no lighting, camera or
  background). For a print, ask for chunky solid forms and no thin wires or
  spikes, and leave out the stand: the print chain adds the base.
  `enhancePrompt: true` expands a short prompt.
- When the look matters, run `image.generate` first, let the user approve the
  picture, and pass it as `inputs.front`.

Handing it over:

- A generate job's output ends with `reference.png`, the picture the shape
  was built from. Show it as a preview, but never call a model printable from
  a picture. Quote `output.data.printability.status` and
  `output.data.slice.status` instead.
- `model.gcode.3mf` is already sliced for the chosen printer: open it in the
  printer's slicer and print. A `.goo` or `.sl1` file is a sliced resin file:
  copy it to the printer. `stl` and `3mf` are geometry to slice yourself.
- Print time and material from `output.data.slice` are estimates. Say so.
- `output.data.seed` reproduces the result.

## Response envelope

Single resources come back as `{ data: ... }`, lists as
`{ data: [...], meta: { total, page, limit } }`. The SDK unwraps the envelope
for you. Errors use the shape in [errors.md](errors.md).
