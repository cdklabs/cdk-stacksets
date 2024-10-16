import { CdklabsConstructLibrary } from 'cdklabs-projen-project-types';
import { JsonPatch } from 'projen';

const MIN_CDK_VERSION = '2.108.0';
const project = new CdklabsConstructLibrary({
  projenrcTs: true,
  author: 'AWS',
  authorAddress: 'aws-cdk-dev@amazon.com',
  cdkVersion: MIN_CDK_VERSION,
  defaultReleaseBranch: 'main',
  name: 'cdk-stacksets',
  repository: 'https://github.com/cdklabs/cdk-stacksets.git',
  devDeps: ['cdklabs-projen-project-types', '@aws-cdk/integ-tests-alpha', `@aws-cdk/integ-runner@${MIN_CDK_VERSION}`, `aws-cdk@${MIN_CDK_VERSION}`],
  publishDryRun: false,
  private: false,
  enablePRAutoMerge: true,
});

const tasksJson = project.tryFindObjectFile('.projen/tasks.json');
tasksJson?.patch(JsonPatch.add('/tasks/integ:update/requiredEnv', [
  'INTEG_DEPLOYMENT_ACCOUNT',
  'INTEG_TARGET_ACCOUNT',
]));

project.synth();
