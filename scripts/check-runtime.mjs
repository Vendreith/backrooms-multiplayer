import {spawnSync} from 'node:child_process';
const commands=[
  [
    "scripts/test-classic.mjs"
  ],
  [
    "scripts/test-fps.mjs"
  ],
  [
    "scripts/test-tactical.mjs"
  ],
  [
    "scripts/test-handheld.mjs"
  ],
  [
    "--experimental-loader",
    "./scripts/map-test-loader.mjs",
    "scripts/test-environment.mjs"
  ],
  [
    "--experimental-loader",
    "./scripts/map-test-loader.mjs",
    "scripts/test-level94.mjs"
  ],
  [
    "level94_gameplay/tests/run-tests.mjs"
  ],
  [
    "level94_gameplay/tests/ambience-test.mjs"
  ],
  [
    "scripts/validate-poolrooms.mjs"
  ],
  [
    "scripts/audit-poolrooms-art.mjs"
  ],
  [
    "scripts/validate-poolrooms-richness.mjs"
  ],
  [
    "scripts/validate-poolrooms-attractions.mjs"
  ],
  [
    "scripts/validate-poolrooms-sky.mjs"
  ]
];
for(const args of commands){console.log('\nChecking '+args.at(-1));const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);}
console.log('All 13 runtime checks passed.');
