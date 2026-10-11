# Browser interoperability

Schema fixture: [jsonresume/resume-schema, tag v1.0.0](https://github.com/jsonresume/resume-schema/blob/v1.0.0/schema.json). The adjacent `jsonresume-schema-LICENSE.md` preserves the upstream LICENSE.md (MIT; upstream package metadata separately declares BSD-2-Clause). The schema is a test fixture, not a runtime dependency.

The browser branch keeps its existing internal storage schema. JSON Resume is an interchange format, not a storage migration.

| Internal | JSON Resume 1.0 | Notes |
|---|---|---|
| Personal | basics | title → label, website → url, location → location.city (free text) |
| Experience | work | company → name, role → position, bullets → highlights |
| Education | education | school → institution, degree → area, bullets → courses; location is an extension |
| Projects | projects | role → roles, link → url, bullets → highlights |
| Certifications | certificates | partial dates retained as an extension instead of inventing a day |
| Languages | languages | proficiency → fluency |
| Links | basics.profiles | label → network |
| Skills | skills | one named group per section, items → keywords |
| Custom | meta.openresumeCustom | allowed metadata extension; may not be rendered by other tools |

Export removes rich-text markup. ISO year/month/day dates are emitted where accepted; unrecognized dates are retained in `openresumeStart`/`openresumeEnd` extensions. Blank and Present end dates omit `endDate`. URLs are normalized only in interchange output; unsupported URLs are retained as extension text. Export is not a lossless backup: IDs, section order across types, custom titles, template and bullet styles are not portable. Use Back up for exact recovery.

Import maps known fields and parks every unmapped field in a custom section labelled with its source path. Nested unknown values are preserved as JSON text. This is visible, editable content, not hidden storage. Review these sections before exporting a résumé. No external data is executed. Imports always create a new profile. Malformed mapped fields are rejected instead of silently discarded.

Backups collect all `resume-builder:*` keys except the previous rescue copy. Restore validates known keys and refuses future unknown settings, rather than interpreting them. Restore creates a durable rescue in localStorage and offers its download before replacing owned keys. Failed replacement attempts rollback; the rescue remains available if rollback also fails. Browser clearing/site-origin changes can still erase local storage: keep downloaded backups outside the browser. Other localStorage keys are untouched. No cloud sync or automatic OS backup is claimed.
