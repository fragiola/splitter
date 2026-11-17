# Releasing

## Status: not published yet

**The maintainer's npm account is suspended, so nothing of Splitter is on npm.** Everything in the
repository is ready: the changesets of the first release (`.changeset/splitter-core.md`,
`.changeset/splitter-react.md`, `.changeset/splitter-vue.md`, `.changeset/splitter-angular.md`, a
`minor` each: `0.0.0` to `0.1.0`), the release workflow, the
package check and the CI jobs. Until the steps below are done, nothing can publish:

- the pending changesets only make the release workflow open (or update) the **Version Packages**
  PR; the publish runs only once that PR is merged;
- there is no npm token anywhere, and npm accepts the workflow's OIDC token only after
  `npm trust` names this repository, `release.yml` and the `npm` environment (step 5).

**Do not merge the Version Packages PR before step 5.** When the account is back, do the steps of
[The first release](#the-first-release-010) in order, 1 to 9. Nothing else is needed: no file of
the repository changes.

## How a release works

Releasing is a merge. [Changesets](https://changesets.dev) versions every package under
`packages/` (`@fragiola/splitter`, `@fragiola/splitter-react`, `@fragiola/splitter-vue` and
`@fragiola/splitter-angular`) together (one `fixed` group,
`@fragiola/*`, so they always share a version) and writes their changelogs. The release workflow,
[`.github/workflows/release.yml`](../.github/workflows/release.yml), publishes them with pnpm
through npm **trusted publishing** (OIDC, with provenance): there is no npm token anywhere.

On every push to `main` the workflow does one of three things:

- **changesets are pending:** it opens or updates the **Version Packages** PR, which bumps the
  versions, writes the `CHANGELOG.md` files and deletes the changesets;
- **no changeset, and `main`'s version is not on npm** (the Version Packages PR was just merged):
  it builds the packages, packs them with pnpm, checks those tarballs
  (`scripts/check-package.ts --tarballs`), publishes them from the `npm` environment, then pushes
  the git tags (`@fragiola/splitter@0.1.0`, …) and creates the GitHub releases;
- otherwise nothing.

Packing and publishing always go through pnpm: it applies `publishConfig` (the dist-only
`exports`), npm does not. Never publish with `npm publish`. `pnpm check:package` checks locally
what would be published (CI's *Package* job runs it on every PR).

## The first release (0.1.0)

npm can only trust a publisher for a package that already exists, so the first publish is a manual
`0.0.0` stub. Do these steps in order, once. The packages stay at `0.0.0` on `main` until the
Version Packages PR is merged (step 8), so the stub can be published from `main` at any time
before that.

1. **The scope.** Make sure the npm scope `@fragiola` exists and that your npm account owns it
   (`npm org ls fragiola`, or <https://www.npmjs.com/settings/fragiola/members>), and that the
   names `@fragiola/splitter`, `@fragiola/splitter-react`, `@fragiola/splitter-vue` and
   `@fragiola/splitter-angular` are free
   (`npm view @fragiola/splitter` answers `E404`). Your account has 2FA enabled.

2. **Let the workflow open PRs.** First in the **organization**: *Settings → Actions → General →
   Workflow permissions*, enable **Allow GitHub Actions to create and approve pull requests** (the
   repository's checkbox is greyed out until the organization allows it). Then in the
   **repository** `fragiola/splitter`: *Settings → Actions → General → Workflow permissions*, the
   same checkbox. Without it, the workflow cannot open the Version Packages PR (its *Version
   Packages PR* job fails; nothing else breaks).

3. **The `npm` environment.** In the repository's *Settings → Environments*, create an environment
   named exactly `npm`. Under *Deployment branches and tags*, choose *Selected branches and tags*
   and add the rule `main`. The publish job runs in this environment, and npm will trust only a
   run of `release.yml` in it, so a run from any other branch cannot publish. (A required reviewer
   on it would make every publish wait for an approval; optional.) Create it before the first
   release run reaches the publish job: GitHub creates a missing environment on its first use,
   with no branch rule.

4. **The stub.** From a clean checkout of `main`, with every package at `0.0.0`:

   ```sh
   git switch main && git pull && git status   # clean, up to date
   pnpm install --frozen-lockfile
   pnpm --filter "./packages/*" publish --access public --dry-run   # what would be published
   pnpm build && pnpm --filter "./packages/*" publish --access public
   ```

   pnpm asks for your 2FA code. It publishes the core first, then the React, Vue and Angular
   packages, which depend on the core at exactly `0.0.0`. The Angular package is published from
   its build output (`publishConfig.directory`: `dist`, with the manifest its build writes there),
   so `pnpm build` must come first, as above.

5. **The trusted publisher.** With npm 11.15 or later (`npm --version`; `npm install -g
   npm@latest` updates it) and your account's 2FA, for each package:

   ```sh
   npm trust github @fragiola/splitter --file release.yml --repo fragiola/splitter --environment npm --allow-publish
   npm trust github @fragiola/splitter-react --file release.yml --repo fragiola/splitter --environment npm --allow-publish
   npm trust github @fragiola/splitter-vue --file release.yml --repo fragiola/splitter --environment npm --allow-publish
   npm trust github @fragiola/splitter-angular --file release.yml --repo fragiola/splitter --environment npm --allow-publish
   ```

   `--allow-publish` is required: since 2026-09-03 a trusted publisher only gets staged publishing
   unless `npm publish` is allowed explicitly, and Changesets does not do staged publishing.
   `npm trust list <package>` shows the configuration. The repository, the filename and the
   environment are all part of it: never rename `release.yml` or its `npm` environment.

6. **The www dispatch token.** CI's *Trigger www build* job asks `fragiola/www` to rebuild
   fragiola.com after every push to `main`; without a token its step is skipped. Create a
   **fine-grained personal access token** (or a GitHub App token): resource owner `fragiola`,
   repository access only `fragiola/www`, repository permissions **Contents: Read and write** and
   Metadata: Read, with an expiry. Store it as the **`WWW_DISPATCH_TOKEN`** Actions secret of
   `fragiola/splitter` (*Settings → Secrets and variables → Actions*), or once as an organization
   secret shared with this repository. The site also needs Splitter registered in www's
   `projects.json` (slug `splitter`, `devUrl` `http://localhost:5184`): a change of `fragiola/www`,
   see `../www/README.md`. This step is independent of npm and can be done any time.

7. **The Version Packages PR.** It exists once the changesets are on `main` and step 2 is done
   (`changeset-release/main`: every package at `0.1.0`, every changelog). If the *Release* run of
   that push failed because step 2 was not done yet, open it in the Actions tab and choose
   *Re-run all jobs*. A PR opened with the workflow's token starts no other workflow, so CI does
   not run on it by itself: close and reopen the PR (or run *CI* on its branch from the Actions
   tab) to get the checks.

8. **Merge the Version Packages PR.** The release workflow publishes `0.1.0` with provenance. Merge
   nothing else until that run is over (see *While a release runs*). Then check every package on
   npm (`0.1.0` is `latest`, with provenance), its tag and its GitHub release.

9. **Lock it down.** On npm, for each package, *Settings → Publishing access*: **Require
   two-factor authentication and disallow tokens**. From now on only the workflow publishes (and
   you, interactively with 2FA, if ever needed). Then remove the *Status* section at the top of
   this page.

## Later releases

- **Every PR that changes what a package ships** adds a changeset: `pnpm changeset`, pick the bump
  and write the summary for the changelog (what changed and, for a break, how to update). Commit
  the `.changeset/*.md` file with the PR. "What a package ships" is `changedFilePatterns` in
  `.changeset/config.json`: its `src`, `package.json`, `README.md`, `LICENSE` and build configs.
  A PR that touches only tests, docs, examples, the playground or the tooling needs none. CI's
  *Changesets* job fails a PR that should have one (the Version Packages PR is skipped).
- **The bump.** The packages are one `fixed` group: a changeset for any of them bumps them all.
  While Splitter is `0.x`, a breaking change is a `minor` (`0.1` → `0.2`), anything else a
  `patch`.
- **Releasing.** Merging such PRs keeps the Version Packages PR up to date. Merge it when you want
  to release (re-trigger its CI first, as in step 7). Never bump the versions or edit the
  changelogs by hand. `pnpm changeset status --verbose` shows what the next release contains.
- **Possible improvement.** The Version Packages PR would get its CI by itself if the version job
  pushed with a GitHub App's token (the `github-token` input of `changesets/action/version`)
  instead of the workflow's. That needs an App installed on the repository and its key as a
  secret.

## Adding a package

A new adapter (`packages/vue` as `@fragiola/splitter-vue`, Epic #10; `packages/angular` as
`@fragiola/splitter-angular`, Epic #13) needs nothing in the release workflow: it builds and packs
`./packages/*`, and the `fixed` group of `.changeset/config.json` is `@fragiola/*`, so the new
package is versioned with the others from its first release. What it does need:

1. **In the PR that adds it:** the package at version `0.0.0`, depending on the core with
   `workspace:*` (published as the exact version); its entry in `ADAPTERS` in
   `scripts/check-package.ts` with its smoke app (`check:package` fails on a package under
   `packages/` that is neither the core nor listed; Dockable's `scripts/check-package.ts` has the
   Vue and Angular smoke apps to copy); and a changeset that names it, so the Version Packages PR
   brings it to the family's next version.
2. **Before merging that PR, the stub.** npm trusts a publisher only for a package that exists, so
   publish the new package once by hand at `0.0.0`, as in step 4 of *The first release*, but for
   that package only (`pnpm --filter @fragiola/splitter-vue publish --access public`, from a clean
   checkout of the PR's branch, with 2FA). A package published from its build output (an Angular
   one built by ng-packagr, `publishConfig.directory` being `dist`) is built first
   (`pnpm --filter @fragiola/splitter-angular build`): pnpm publishes that directory, with the
   manifest its build writes there.
3. **Its trusted publisher,** as in step 5: `npm trust github @fragiola/splitter-vue --file
   release.yml --repo fragiola/splitter --environment npm --allow-publish` (the same for
   `@fragiola/splitter-angular`).
4. **After its first release,** lock it down as in step 9.

Without steps 2 and 3, the first publish of the new package fails with `E404` or `ENEEDAUTH`
while the others publish: the release is then half published (see *When a publish fails*).

### The Vue package (`@fragiola/splitter-vue`)

Added by Epic #10, before anything was published: it is one of the packages of
[The first release](#the-first-release-010), which stubs (step 4, `./packages/*`), trusts (step 5)
and locks down (step 9) it with the others. Its changeset is `.changeset/splitter-vue.md`, and its
entry in `ADAPTERS` smoke-tests it in a Vite + Vue app with a single-file component checked by
vue-tsc on TypeScript 6. Only if the first release ever goes out without it, take the steps above
for it alone:

```sh
pnpm --filter @fragiola/splitter-vue publish --access public --dry-run   # what would be published
pnpm --filter @fragiola/splitter-vue build && pnpm --filter @fragiola/splitter-vue publish --access public
npm trust github @fragiola/splitter-vue --file release.yml --repo fragiola/splitter --environment npm --allow-publish
```

### The Angular package (`@fragiola/splitter-angular`)

Added by Epic #13, before anything was published: like the Vue package, it is one of the packages
of [The first release](#the-first-release-010) (steps 4, 5 and 9). Its changeset is
`.changeset/splitter-angular.md`. It differs from the others in how it is built and packed:

- **ng-packagr** builds it (Angular Package Format, partial compilation, ESM only) on TypeScript
  6.0.3, pinned in `packages/angular` only (the Angular compiler supports `>=6.0 <6.1`; the rest
  of the repository is on TypeScript 7). `scripts/publish-manifest.ts` then rewrites
  `dist/package.json`: the repo's `exports` without the source condition, the core as its only
  dependency (no `tslib`).
- **It is published from `dist`** (`publishConfig.directory`), so it must be built before it is
  packed or published; the release workflow builds every package first.
- **Its smoke app** in `ADAPTERS` is a Vite app with `@analogjs/vite-plugin-angular` and a
  standalone component, checked by `ngc` with strict templates, at the versions
  `packages/angular` pins. `scripts/check-dts.ts` ignores the Angular compiler's own `ɵ`
  metadata (`static ɵdir`, `static ɵfac`), which names a generic directive with `any`.

Only if the first release ever goes out without it:

```sh
pnpm --filter @fragiola/splitter-angular build
pnpm --filter @fragiola/splitter-angular publish --access public --dry-run   # what would be published
pnpm --filter @fragiola/splitter-angular publish --access public
npm trust github @fragiola/splitter-angular --file release.yml --repo fragiola/splitter --environment npm --allow-publish
```

## While a release runs

From the merge of the Version Packages PR until its *Release* run has finished, merge nothing
else. Each push to `main` starts its own run, and each run decides on its own: a PR merged in the
meantime with no changeset would also be in publish mode, and could publish the same version from
a different commit. The publish of one commit is never cancelled by a later push.

## When a publish fails

After a failed publish, `main` holds the bumped version (say `0.2.0`) and no changeset, and npm
lacks that version for one package or both. The release workflow publishes it on the next run
**that finds no changeset on `main`**, so:

- **The cause was outside the repository** (npm down, the trusted publisher or the `npm`
  environment misconfigured): fix that, then open the failed run of *Release* and choose *Re-run
  all jobs* (possible for 30 days). Its select-mode job computes the plan again: only what npm
  lacks.
- **The cause is in the repository** (a build or the tarball check fails): fix it in a PR that
  **adds no changeset**. Its merge leaves `main` with no changeset, so that run publishes the
  bumped version, fix included. CI's *Changesets* job fails on that PR when it touches a package's
  shipped files; that is expected here, and the check is not required: merge it anyway. Do not
  add an empty changeset (`pnpm changeset --empty`) to quiet it: any changeset on `main` stops the
  publish, and an empty one releases nothing.
- **Until the stuck version is out, merge no PR that adds a changeset.** It would turn the next
  run into a version run, which bumps past the stuck version (`0.2.1`), and that version would
  never be published. If that is what you want (give up on the stuck version), deprecate whatever
  part of it reached npm (below) and release the next one.
- **Half published** (the core is on npm, an adapter is not): any of the above publishes
  the rest. Changesets skips a version npm already has; the failed run already pushed the tags
  and created the releases of what it did publish.
- **Published, but a tag or a release is missing** (the run failed after npm): the workflow will
  not publish again, so create them by hand: the tag `<package>@<version>` on the commit the
  publish ran from, and a GitHub release from it with the changelog's section.
- **`ENEEDAUTH`, `E404` or `E403` on publish:** the trusted publisher does not match the run.
  Check `npm trust list <package>`: the repository `fragiola/splitter`, the file `release.yml`,
  the environment `npm`, publishing allowed. The packages' `repository.url` must point to this
  repository.
- **A broken version went out:** npm versions cannot be reused. Deprecate it
  (`npm deprecate @fragiola/splitter@<version> "<why>"`, the same for each adapter) and
  release a fix with a new changeset.
