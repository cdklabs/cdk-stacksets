import { CdklabsConstructLibrary } from 'cdklabs-projen-project-types';

const project = new CdklabsConstructLibrary({
  projenrcTs: true,
  author: 'AWS',
  authorAddress: 'aws-cdk-dev@amazon.com',
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-stacksets',
  repositoryUrl: 'https://github.com/cdklabs/cdk-stacksets.git',
  minNodeVersion: '14.18.0',
  devDeps: ['cdklabs-projen-project-types'],
});
project.synth();