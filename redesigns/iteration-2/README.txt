967 Initiative redesign, iteration 2: the three designs, code only.

Each folder holds only the files that design added or changed, in their real project paths, relative to main commit d6ce164.
Not included: node_modules, build output, gitignored files (.env.local and so on), screenshots, and raw measurement data.
If a design deleted files, they are listed in DELETED_FILES.txt in its folder.

Each designer's case study: <design>/docs/redesign/design-*/README.md

To try a design: copy its folder's contents over a checkout of main at d6ce164, delete any files in its DELETED_FILES.txt, then run npm ci and add your .env.local.
