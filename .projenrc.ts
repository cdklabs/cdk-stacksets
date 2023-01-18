import { CdklabsConstructLibrary } from 'cdklabs-projen-project-types';

const project = new CdklabsConstructLibrary({
  projenrcTs: true,
  author: 'AWS',
  authorAddress: 'aws-cdk-dev@amazon.com',
  cdkVersion: '2.45.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-stacksets',
  repositoryUrl: 'https://github.com/cdklabs/cdk-stacksets.git',
  minNodeVersion: '14.18.0',
  devDeps: ['cdklabs-projen-project-types@^0.0.9', '@aws-cdk/integ-tests-alpha', '@aws-cdk/integ-runner@2.60.0', 'aws-cdk@2.60.0'],
  publishDryRun: false,
  private: false,
});

const integSnapshotTask = project.addTask('integ', {
  description: 'Run integration snapshot tests',
  exec: 'yarn integ-runner --language typescript',
});

project.addTask('integ:update', {
  description: 'Run and update integration snapshot tests',
  exec: 'yarn integ-runner --language typescript --update-on-failed',
  requiredEnv: [
    'INTEG_DEPLOYMENT_ACCOUNT',
    'INTEG_TARGET_ACCOUNT',
  ],
});

const rosettaTask = project.addTask('rosetta:extract', {
  description: 'Test rosetta extract',
  exec: 'yarn --silent jsii-rosetta extract',
});

project.testTask.spawn(integSnapshotTask);
project.postCompileTask.spawn(rosettaTask);
project.addGitIgnore('.jsii.tabl.json');
project.synth();
