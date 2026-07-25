# Release Policy

Releases are performed only by MakePay by MakeCrypto maintainers.

- Public repositories accept issues and pull requests, but maintainers control release approval, versioning, tagging, and package publishing.
- npm publishing uses the package's GitHub Actions trusted publisher, short-lived OIDC credentials, and provenance. Do not add an npm token to repository or environment secrets.
- Protected branch and tag rules must remain enabled for `main` and release tags.
- Version bumps should be made only when maintainers intend to publish a new package or release artifact.

## npm release sequence

1. Merge a reviewed, conflict-free pull request after Node 18, 22, and 24 CI, tests, build, package inspection, and the production dependency audit pass.
2. Configure the npm trusted publisher for `makepay-io/makepay-npm-sdk`, workflow `publish.yml`, and GitHub environment `npm-release`.
3. Tag the exact merge commit as `v<package-version>`. The release workflow validates main ancestry and publishes the immutable version to the `next` dist-tag with provenance.
4. Install and smoke-test the exact registry version, then move `latest` to that same version. Do not rebuild or republish for promotion.
5. After trusted publishing and promotion are verified, revoke any previous long-lived npm automation or access token.
6. Publish the GitHub release and `CHANGELOG.md` notes from the same tag.

If candidate validation fails, leave `latest` unchanged. If a defect is found after promotion, move `latest` back to the prior stable version, deprecate the affected version with a useful message, and publish a new patch version rather than unpublishing it.
