import { CdklabsConstructLibrary } from 'cdklabs-projen-project-types';
import { JsonPatch } from 'projen';

const project = new CdklabsConstructLibrary({
  projenrcTs: true,
  author: 'AWS',
  authorAddress: 'aws-cdk-dev@amazon.com',
  cdkVersion: '2.45.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-stacksets',
  repositoryUrl: 'https://github.com/cdklabs/cdk-stacksets.git',
  minNodeVersion: '14.18.0',
  devDeps: ['cdklabs-projen-project-types', '@aws-cdk/integ-tests-alpha', '@aws-cdk/integ-runner@2.60.0', 'aws-cdk@2.60.0'],
  publishDryRun: false,
  private: false,
});

const tasksJson = project.tryFindObjectFile('.projen/tasks.json');
tasksJson?.patch(JsonPatch.add('/tasks/integ:update/requiredEnv', [
  'INTEG_DEPLOYMENT_ACCOUNT',
  'INTEG_TARGET_ACCOUNT',
]));

project.synth();
