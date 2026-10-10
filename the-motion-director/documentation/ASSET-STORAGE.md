# Asset storage

Raw footage, photographs, audio, proxies, previews, final exports and Remotion renders are git-ignored by default (`.gitignore`). Do not push private or sensitive footage to a public repository.

If you want media versioned: use a **private** repository, run `git lfs install`, un-ignore only the folders you want, and rely on `.gitattributes` (it already routes common media types to LFS). Alternatively keep media on an external or cloud drive and version only the editable project: timelines, captions, visual system, shortlist, licences, reports. The engine regenerates everything else from the originals.

Never commit credentials, API keys or tokens. `.gitignore` excludes the usual file patterns, but it is not a substitute for care.
