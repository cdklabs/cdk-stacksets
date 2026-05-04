import { CdklabsConstructLibrary } from 'cdklabs-projen-project-types';
import { DependencyType, JsonPatch } from 'projen';

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

// Pin @aws-cdk/integ-tests-alpha to a version compatible with MIN_CDK_VERSION.
// The integ-runner component hardcodes @latest, but newer versions use TC39
// decorators that require a newer aws-cdk-lib than what this project supports.
project.deps.addDependency(`@aws-cdk/integ-tests-alpha@${MIN_CDK_VERSION}-alpha.0`, DependencyType.DEVENV);

const tasksJson = project.tryFindObjectFile('.projen/tasks.json');
tasksJson?.patch(JsonPatch.add('/tasks/integ:update/requiredEnv', [
  'INTEG_DEPLOYMENT_ACCOUNT',
  'INTEG_TARGET_ACCOUNT',
]));

project.synth();
