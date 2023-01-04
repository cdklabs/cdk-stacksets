const { CdklabsConstructLibrary } = require("cdklabs-projen-project-types");
const project = new CdklabsConstructLibrary({
  author: "AWS",
  authorAddress: "aws-cdk-dev@amazon.com",
  cdkVersion: "2.1.0",
  defaultReleaseBranch: "main",
  name: "cdk-stacksets",
  repositoryUrl: "https://github.com/cdklabs/cdk-stacksets.git",

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();