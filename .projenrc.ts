import { CdklabsConstructLibrary } from 'cdklabs-projen-project-types';
import { JsonPatch } from 'projen';

const MIN_CDK_VERSION = '2.113.0';
const project = new CdklabsConstructLibrary({
  projenrcTs: true,
  author: 'AWS',
  authorAddress: 'aws-cdk-dev@amazon.com',
  cdkVersion: MIN_CDK_VERSION,
  defaultReleaseBranch: 'main',
  name: 'cdk-stacksets',
  repositoryUrl: 'https://github.com/cdklabs/cdk-stacksets.git',
  devDeps: ['cdklabs-projen-project-types', `@aws-cdk/cloud-assembly-schema@${MIN_CDK_VERSION}`, `@aws-cdk/integ-tests-alpha@${MIN_CDK_VERSION}-alpha.0`, `@aws-cdk/integ-runner@${MIN_CDK_VERSION}`, `aws-cdk@${MIN_CDK_VERSION}`],
  publishDryRun: false,
  private: false,
});

const tasksJson = project.tryFindObjectFile('.projen/tasks.json');
tasksJson?.patch(JsonPatch.add('/tasks/integ:update/requiredEnv', [
  'INTEG_DEPLOYMENT_ACCOUNT',
  'INTEG_TARGET_ACCOUNT',
]));

project.synth();
