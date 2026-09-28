import fs from 'node:fs';
import path from 'node:path';

const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'COPYING',
  'COPYING.txt',
];

const SIGNATURES = [
  {
    spdxId: 'MIT',
    name: 'MIT License',
    patterns: [/MIT License/i, /Permission is hereby granted, free of charge/i],
  },
  {
    spdxId: 'Apache-2.0',
    name: 'Apache License 2.0',
    patterns: [/Apache License/i, /Version 2\.0/i],
  },
  {
    spdxId: 'AGPL-3.0',
    name: 'GNU Affero General Public License v3.0',
    patterns: [/GNU AFFERO GENERAL PUBLIC LICENSE/i, /Version 3/i],
  },
  {
    spdxId: 'GPL-3.0',
    name: 'GNU General Public License v3.0',
    patterns: [/GNU GENERAL PUBLIC LICENSE/i, /Version 3/i],
  },
  {
    spdxId: 'LGPL-3.0',
    name: 'GNU Lesser General Public License v3.0',
    patterns: [/GNU LESSER GENERAL PUBLIC LICENSE/i, /Version 3/i],
  },
  {
    spdxId: 'ISC',
    name: 'ISC License',
    patterns: [/ISC License/i, /Permission to use, copy, modify, and\/or distribute this software for any purpose/i],
  },
  {
    spdxId: 'BSD-3-Clause',
    name: 'BSD 3-Clause License',
    patterns: [/Redistribution and use in source and binary forms/i, /Neither the name of/i],
  },
  {
    spdxId: 'BSD-2-Clause',
    name: 'BSD 2-Clause License',
    patterns: [/Redistribution and use in source and binary forms/i],
  },
  {
    spdxId: 'MPL-2.0',
    name: 'Mozilla Public License 2.0',
    patterns: [/Mozilla Public License/i, /Version 2\.0/i],
  },
  {
    spdxId: 'Unlicense',
    name: 'The Unlicense',
    patterns: [/This is free and unencumbered software released into the public domain/i],
  },
];

/**
 * Detect license file and determine SPDX identifier.
 */
export async function detectLicense(rootDir) {
  for (const filename of LICENSE_FILES) {
    const filePath = path.join(rootDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const sig of SIGNATURES) {
          const matchAll = sig.patterns.every((p) => p.test(content));
          if (matchAll) {
            return {
              spdxId: sig.spdxId,
              name: sig.name,
              file: filename,
            };
          }
        }
        return {
          spdxId: 'Custom',
          name: 'Custom License',
          file: filename,
        };
      } catch {
        return null;
      }
    }
  }

  return null;
}
