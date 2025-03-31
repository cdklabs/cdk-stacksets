import { CdklabsConstructLibrary } from 'cdklabs-projen-project-types';
import { JsonPatch } from 'projen';

const MIN_CDK_VERSION = '2.179.0';
const project = new CdklabsConstructLibrary({
  projenrcTs: true,
  author: 'AWS',
  authorAddress: 'aws-cdk-dev@amazon.com',
  cdkVersion: MIN_CDK_VERSION,
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.6.0',
  name: 'cdk-stacksets',
  repository: 'https://github.com/cdklabs/cdk-stacksets.git',
  devDeps: ['cdklabs-projen-project-types', '@aws-cdk/integ-tests-alpha', `@aws-cdk/integ-runner@${MIN_CDK_VERSION}`, `aws-cdk@${MIN_CDK_VERSION}`],
  publishDryRun: false,
  private: false,
  enablePRAutoMerge: true,
  // Keep synchronized with https://github.com/nodejs/release#release-schedule
  minNodeVersion: '18.12.0', // 'MAINTENANCE' (first LTS)
  maxNodeVersion: '22.x', // 'CURRENT'
  workflowNodeVersion: '20.x', // 'ACTIVE'
});

const tasksJson = project.tryFindObjectFile('.projen/tasks.json');
tasksJson?.patch(JsonPatch.add('/tasks/integ:update/requiredEnv', [
  'INTEG_DEPLOYMENT_ACCOUNT',
  'INTEG_TARGET_ACCOUNT',
]));

project.synth();
