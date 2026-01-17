"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const aws_cdk_lib_1 = require("aws-cdk-lib");
const assertions_1 = require("aws-cdk-lib/assertions");
const cxapi = __importStar(require("aws-cdk-lib/cx-api"));
const stackset_1 = require("../src/stackset");
const stackset_stack_1 = require("../src/stackset-stack");
class LambdaStackSet extends stackset_stack_1.StackSetStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        new aws_cdk_lib_1.aws_lambda.Function(this, 'Lambda', {
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: aws_cdk_lib_1.aws_lambda.Code.fromAsset(path_1.default.join(__dirname, 'lambda')),
        });
        new aws_cdk_lib_1.aws_lambda.Function(this, 'Lambda2', {
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: aws_cdk_lib_1.aws_lambda.Code.fromAsset(path_1.default.join(__dirname, 'lambda')),
        });
    }
}
test('default', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SELF_MANAGED',
        TemplateURL: {
            'Fn::Sub': 'https://s3.${AWS::Region}.${AWS::URLSuffix}/cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.json',
        },
        StackInstancesGroup: [{
                Regions: ['us-east-1'],
                DeploymentTargets: {
                    Accounts: ['11111111111'],
                },
            }],
    });
});
test('stackset with parameters', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
        parameters: {
            Param1: 'Value1',
            Param2: 'Value2',
        },
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SELF_MANAGED',
        Parameters: [{
                ParameterKey: 'Param1',
                ParameterValue: 'Value1',
            }, {
                ParameterKey: 'Param2',
                ParameterValue: 'Value2',
            }],
        StackInstancesGroup: [{
                Regions: ['us-east-1'],
                DeploymentTargets: {
                    Accounts: ['11111111111'],
                },
            }],
    });
});
test('self managed stackset creates adminRole by default', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SELF_MANAGED',
        AdministrationRoleARN: { 'Fn::GetAtt': ['AdminRole38563C57', 'Arn'] },
        TemplateURL: {
            'Fn::Sub': 'https://s3.${AWS::Region}.${AWS::URLSuffix}/cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.json',
        },
        StackInstancesGroup: [{
                Regions: ['us-east-1'],
                DeploymentTargets: {
                    Accounts: ['11111111111'],
                },
            }],
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { Service: 'cloudformation.amazonaws.com' },
                    Action: 'sts:AssumeRole',
                },
            ],
        },
    });
});
test('self managed stackset with disabled regions', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1', 'af-south-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SELF_MANAGED',
        AdministrationRoleARN: { 'Fn::GetAtt': ['AdminRole38563C57', 'Arn'] },
        TemplateURL: {
            'Fn::Sub': 'https://s3.${AWS::Region}.${AWS::URLSuffix}/cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.json',
        },
        StackInstancesGroup: [{
                Regions: ['us-east-1', 'af-south-1'],
                DeploymentTargets: {
                    Accounts: ['11111111111'],
                },
            }],
    });
    // Service principal now uses partition-aware URL suffix
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { Service: 'cloudformation.amazonaws.com' },
                    Action: 'sts:AssumeRole',
                },
                {
                    Effect: 'Allow',
                    Principal: {
                        Service: {
                            'Fn::Join': [
                                '',
                                [
                                    'cloudformation.af-south-1.',
                                    { Ref: 'AWS::URLSuffix' },
                                ],
                            ],
                        },
                    },
                    Action: 'sts:AssumeRole',
                },
            ],
        },
    });
});
test('service managed stackset', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        deploymentType: stackset_1.DeploymentType.serviceManaged(),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SERVICE_MANAGED',
        CallAs: 'DELEGATED_ADMIN',
        AutoDeployment: {
            Enabled: true,
            RetainStacksOnAccountRemoval: true,
        },
        TemplateURL: {
            'Fn::Sub': 'https://s3.${AWS::Region}.${AWS::URLSuffix}/cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.json',
        },
        StackInstancesGroup: [{
                ParameterOverrides: [{
                        ParameterKey: 'Param1',
                        ParameterValue: 'Value1',
                    }],
                Regions: ['us-east-1'],
                DeploymentTargets: {
                    Accounts: ['11111111111'],
                    AccountFilterType: 'INTERSECTION',
                },
            }],
    });
});
test('service managed stackset with options', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        deploymentType: stackset_1.DeploymentType.serviceManaged({
            delegatedAdmin: false,
            autoDeployEnabled: false,
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SERVICE_MANAGED',
        CallAs: 'SELF',
        AutoDeployment: {
            Enabled: false,
        },
        TemplateURL: {
            'Fn::Sub': 'https://s3.${AWS::Region}.${AWS::URLSuffix}/cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.json',
        },
        StackInstancesGroup: [{
                Regions: ['us-east-1'],
                DeploymentTargets: {
                    Accounts: ['11111111111'],
                    AccountFilterType: 'INTERSECTION',
                },
            }],
    });
});
test('service managed stackset throws error if autoDeployRetainStacks is provided and autoDeploy is disabled', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    expect(() => {
        new stackset_1.StackSet(stack, 'StackSet', {
            target: stackset_1.StackSetTarget.fromAccounts({
                regions: ['us-east-1'],
                accounts: ['11111111111'],
                parameterOverrides: {
                    Param1: 'Value1',
                },
            }),
            deploymentType: stackset_1.DeploymentType.serviceManaged({
                delegatedAdmin: false,
                autoDeployEnabled: false,
                autoDeployRetainStacks: true,
            }),
            template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
        });
    }).toThrow(/autoDeployRetainStacks only applies if autoDeploy is enabled/);
});
test('fromOrganizations default', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromOrganizationalUnits({
            regions: ['us-east-1'],
            organizationalUnits: ['ou-1111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        deploymentType: stackset_1.DeploymentType.serviceManaged({
            delegatedAdmin: false,
            autoDeployEnabled: false,
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SERVICE_MANAGED',
        CallAs: 'SELF',
        AutoDeployment: {
            Enabled: false,
        },
        TemplateURL: {
            'Fn::Sub': 'https://s3.${AWS::Region}.${AWS::URLSuffix}/cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.json',
        },
        StackInstancesGroup: [{
                Regions: ['us-east-1'],
                DeploymentTargets: {
                    AccountFilterType: 'NONE',
                },
            }],
    });
});
test('has IAM capabilities', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
        capabilities: [stackset_1.Capability.IAM, stackset_1.Capability.NAMED_IAM],
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SELF_MANAGED',
        TemplateURL: {
            'Fn::Sub': 'https://s3.${AWS::Region}.${AWS::URLSuffix}/cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.json',
        },
        StackInstancesGroup: [{
                Regions: ['us-east-1'],
                DeploymentTargets: {
                    Accounts: ['11111111111'],
                },
            }],
        Capabilities: [
            'CAPABILITY_IAM',
            'CAPABILITY_NAMED_IAM',
        ],
    });
});
test('requires asset bucket to be passed', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    expect(() => {
        const lambdaStack = new LambdaStackSet(stack, 'LambdaStack');
        new stackset_1.StackSet(stack, 'StackSet', {
            target: stackset_1.StackSetTarget.fromAccounts({
                regions: ['us-east-1'],
                accounts: ['11111111111'],
            }),
            template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(lambdaStack, 'LambdaStack')),
            capabilities: [stackset_1.Capability.IAM, stackset_1.Capability.NAMED_IAM],
        });
    }).toThrow('An Asset Bucket must be provided to use File Assets');
});
test('test lambda assets with one asset bucket', () => {
    const app = new aws_cdk_lib_1.App({
        context: {
            [cxapi.ASSET_RESOURCE_METADATA_ENABLED_CONTEXT]: true,
        },
    });
    const stack = new aws_cdk_lib_1.Stack(app);
    const lambdaStack = new LambdaStackSet(stack, 'LambdaStack', {
        assetBuckets: [aws_cdk_lib_1.aws_s3.Bucket.fromBucketName(stack, 'AssetBucket', 'integ-assets')],
        assetBucketPrefix: 'prefix',
    });
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(lambdaStack),
        capabilities: [stackset_1.Capability.IAM, stackset_1.Capability.NAMED_IAM],
    });
    assertions_1.Template.fromStack(stack).resourceCountIs('Custom::CDKBucketDeployment', 1);
});
test('test lambda assets with two asset buckets', () => {
    const app = new aws_cdk_lib_1.App({
        context: {
            [cxapi.ASSET_RESOURCE_METADATA_ENABLED_CONTEXT]: true,
        },
    });
    const stack = new aws_cdk_lib_1.Stack(app);
    const lambdaStack = new LambdaStackSet(stack, 'LambdaStack', {
        assetBuckets: [aws_cdk_lib_1.aws_s3.Bucket.fromBucketName(stack, 'AssetBucket', 'integ-assets'), aws_cdk_lib_1.aws_s3.Bucket.fromBucketName(stack, 'AssetBucket2', 'integ-assets2')],
        assetBucketPrefix: 'prefix',
    });
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(lambdaStack),
        capabilities: [stackset_1.Capability.IAM, stackset_1.Capability.NAMED_IAM],
    });
    assertions_1.Template.fromStack(stack).resourceCountIs('Custom::CDKBucketDeployment', 2);
});
test('passes operation preferences', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
            parameterOverrides: {
                Param1: 'Value1',
            },
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
        operationPreferences: {
            // In reality, you would not set all of these at once, but it allows us to test all the properties in one test case
            regionConcurrencyType: stackset_1.RegionConcurrencyType.PARALLEL,
            regionOrder: ['us-east-1', 'us-west-2'],
            maxConcurrentPercentage: 50,
            maxConcurrentCount: 5,
            failureTolerancePercentage: 10,
            failureToleranceCount: 1,
        },
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::CloudFormation::StackSet', {
        ManagedExecution: { Active: true },
        PermissionModel: 'SELF_MANAGED',
        OperationPreferences: {
            RegionConcurrencyType: 'PARALLEL',
            RegionOrder: ['us-east-1', 'us-west-2'],
            MaxConcurrentPercentage: 50,
            MaxConcurrentCount: 5,
            FailureTolerancePercentage: 10,
            FailureToleranceCount: 1,
        },
        TemplateURL: {
            'Fn::Sub': 'https://s3.${AWS::Region}.${AWS::URLSuffix}/cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.json',
        },
        StackInstancesGroup: [{
                Regions: ['us-east-1'],
                DeploymentTargets: {
                    Accounts: ['11111111111'],
                },
            }],
    });
});
test('self managed stackset uses partition-aware ARN for execution role', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    // For env-agnostic stacks, formatArn produces a Fn::Join with AWS::Partition
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
            Statement: [
                {
                    Effect: 'Allow',
                    Action: 'sts:AssumeRole',
                    Resource: {
                        'Fn::Join': [
                            '',
                            [
                                'arn:',
                                { Ref: 'AWS::Partition' },
                                ':iam::*:role/AWSCloudFormationStackSetExecutionRole',
                            ],
                        ],
                    },
                },
            ],
        },
    });
});
test('self managed stackset with custom execution role name uses partition-aware ARN', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1'],
            accounts: ['11111111111'],
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
        deploymentType: stackset_1.DeploymentType.selfManaged({
            executionRoleName: 'CustomExecutionRole',
        }),
    });
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
            Statement: [
                {
                    Effect: 'Allow',
                    Action: 'sts:AssumeRole',
                    Resource: {
                        'Fn::Join': [
                            '',
                            [
                                'arn:',
                                { Ref: 'AWS::Partition' },
                                ':iam::*:role/CustomExecutionRole',
                            ],
                        ],
                    },
                },
            ],
        },
    });
});
test('self managed stackset with disabled regions uses partition-aware URL suffix', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app);
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-east-1', 'af-south-1'],
            accounts: ['11111111111'],
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    // For env-agnostic stacks, urlSuffix produces AWS::URLSuffix reference
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { Service: 'cloudformation.amazonaws.com' },
                    Action: 'sts:AssumeRole',
                },
                {
                    Effect: 'Allow',
                    Principal: {
                        Service: {
                            'Fn::Join': [
                                '',
                                [
                                    'cloudformation.af-south-1.',
                                    { Ref: 'AWS::URLSuffix' },
                                ],
                            ],
                        },
                    },
                    Action: 'sts:AssumeRole',
                },
            ],
        },
    });
});
test('GovCloud partition - self managed stackset with specific environment', () => {
    const app = new aws_cdk_lib_1.App();
    const stack = new aws_cdk_lib_1.Stack(app, 'TestStack', {
        env: {
            account: '111111111111',
            region: 'us-gov-west-1',
        },
    });
    new stackset_1.StackSet(stack, 'StackSet', {
        target: stackset_1.StackSetTarget.fromAccounts({
            regions: ['us-gov-west-1'],
            accounts: ['11111111111'],
        }),
        template: stackset_1.StackSetTemplate.fromStackSetStack(new stackset_stack_1.StackSetStack(stack, 'Stack')),
    });
    // Verify that the ARN uses AWS::Partition which will correctly resolve to aws-us-gov at deployment time
    // CDK's formatArn produces Fn::Join with AWS::Partition reference even with specific env
    assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
            Statement: [
                {
                    Effect: 'Allow',
                    Action: 'sts:AssumeRole',
                    Resource: {
                        'Fn::Join': [
                            '',
                            [
                                'arn:',
                                { Ref: 'AWS::Partition' },
                                ':iam::*:role/AWSCloudFormationStackSetExecutionRole',
                            ],
                        ],
                    },
                },
            ],
        },
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2stc2V0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGFjay1zZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDZDQUVxQjtBQUVyQix1REFBa0Q7QUFDbEQsMERBQTRDO0FBRTVDLDhDQUFnSTtBQUNoSSwwREFBMEU7QUFFMUUsTUFBTSxjQUFlLFNBQVEsOEJBQWE7SUFDeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixJQUFJLHdCQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDbEMsT0FBTyxFQUFFLHdCQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLHdCQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUM1RCxDQUFDLENBQUM7UUFFSCxJQUFJLHdCQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDbkMsT0FBTyxFQUFFLHdCQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLHdCQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUM1RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFFRCxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNuQixNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFHLEVBQUUsQ0FBQztJQUN0QixNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFL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LENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRTtRQUNsRSxjQUFjLEVBQUU7WUFDZCxTQUFTLEVBQUU7Z0JBQ1Q7b0JBQ0UsTUFBTSxFQUFFLE9BQU87b0JBQ2YsTUFBTSxFQUFFLGdCQUFnQjtvQkFDeEIsUUFBUSxFQUFFO3dCQUNSLFVBQVUsRUFBRTs0QkFDVixFQUFFOzRCQUNGO2dDQUNFLE1BQU07Z0NBQ04sRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUU7Z0NBQ3pCLHFEQUFxRDs2QkFDdEQ7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7XG4gIEFwcCwgU3RhY2ssIGF3c19sYW1iZGEgYXMgbGFtYmRhLCBhd3NfczMgYXMgczMsXG59IGZyb20gJ2F3cy1jZGstbGliJztcblxuaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCAqIGFzIGN4YXBpIGZyb20gJ2F3cy1jZGstbGliL2N4LWFwaSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IENhcGFiaWxpdHksIERlcGxveW1lbnRUeXBlLCBSZWdpb25Db25jdXJyZW5jeVR5cGUsIFN0YWNrU2V0LCBTdGFja1NldFRhcmdldCwgU3RhY2tTZXRUZW1wbGF0ZSB9IGZyb20gJy4uL3NyYy9zdGFja3NldCc7XG5pbXBvcnQgeyBTdGFja1NldFN0YWNrLCBTdGFja1NldFN0YWNrUHJvcHMgfSBmcm9tICcuLi9zcmMvc3RhY2tzZXQtc3RhY2snO1xuXG5jbGFzcyBMYW1iZGFTdGFja1NldCBleHRlbmRzIFN0YWNrU2V0U3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrU2V0U3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xhbWJkYScpKSxcbiAgICB9KTtcblxuICAgIG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0xhbWJkYTInLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGFtYmRhJykpLFxuICAgIH0pO1xuICB9XG59XG5cbnRlc3QoJ2RlZmF1bHQnLCAoKSA9PiB7XG4gIGNvbnN0IGFwcCA9IG5ldyBBcHAoKTtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soYXBwKTtcblxuICBuZXcgU3RhY2tTZXQoc3RhY2ssICdTdGFja1NldCcsIHtcbiAgICB0YXJnZXQ6IFN0YWNrU2V0VGFyZ2V0LmZyb21BY2NvdW50cyh7XG4gICAgICByZWdpb25zOiBbJ3VzLWVhc3QtMSddLFxuICAgICAgYWNjb3VudHM6IFsnMTExMTExMTExMTEnXSxcbiAgICAgIHBhcmFtZXRlck92ZXJyaWRlczoge1xuICAgICAgICBQYXJhbTE6ICdWYWx1ZTEnLFxuICAgICAgfSxcbiAgICB9KSxcbiAgICB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZS5mcm9tU3RhY2tTZXRTdGFjayhuZXcgU3RhY2tTZXRTdGFjayhzdGFjaywgJ1N0YWNrJykpLFxuICB9KTtcblxuICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZEZvcm1hdGlvbjo6U3RhY2tTZXQnLCB7XG4gICAgTWFuYWdlZEV4ZWN1dGlvbjogeyBBY3RpdmU6IHRydWUgfSxcbiAgICBQZXJtaXNzaW9uTW9kZWw6ICdTRUxGX01BTkFHRUQnLFxuICAgIFRlbXBsYXRlVVJMOiB7XG4gICAgICAnRm46OlN1Yic6ICdodHRwczovL3MzLiR7QVdTOjpSZWdpb259LiR7QVdTOjpVUkxTdWZmaXh9L2Nkay1obmI2NTlmZHMtYXNzZXRzLSR7QVdTOjpBY2NvdW50SWR9LSR7QVdTOjpSZWdpb259LzQ0MTM2ZmEzNTViMzY3OGExMTQ2YWQxNmY3ZTg2NDllOTRmYjRmYzIxZmU3N2U4MzEwYzA2MGY2MWNhYWZmOGEuanNvbicsXG4gICAgfSxcbiAgICBTdGFja0luc3RhbmNlc0dyb3VwOiBbe1xuICAgICAgUmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIERlcGxveW1lbnRUYXJnZXRzOiB7XG4gICAgICAgIEFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICB9LFxuICAgIH1dLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdzdGFja3NldCB3aXRoIHBhcmFtZXRlcnMnLCAoKSA9PiB7XG4gIGNvbnN0IGFwcCA9IG5ldyBBcHAoKTtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soYXBwKTtcblxuICBuZXcgU3RhY2tTZXQoc3RhY2ssICdTdGFja1NldCcsIHtcbiAgICB0YXJnZXQ6IFN0YWNrU2V0VGFyZ2V0LmZyb21BY2NvdW50cyh7XG4gICAgICByZWdpb25zOiBbJ3VzLWVhc3QtMSddLFxuICAgICAgYWNjb3VudHM6IFsnMTExMTExMTExMTEnXSxcbiAgICB9KSxcbiAgICB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZS5mcm9tU3RhY2tTZXRTdGFjayhuZXcgU3RhY2tTZXRTdGFjayhzdGFjaywgJ1N0YWNrJykpLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIFBhcmFtMTogJ1ZhbHVlMScsXG4gICAgICBQYXJhbTI6ICdWYWx1ZTInLFxuICAgIH0sXG4gIH0pO1xuXG4gIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNsb3VkRm9ybWF0aW9uOjpTdGFja1NldCcsIHtcbiAgICBNYW5hZ2VkRXhlY3V0aW9uOiB7IEFjdGl2ZTogdHJ1ZSB9LFxuICAgIFBlcm1pc3Npb25Nb2RlbDogJ1NFTEZfTUFOQUdFRCcsXG4gICAgUGFyYW1ldGVyczogW3tcbiAgICAgIFBhcmFtZXRlcktleTogJ1BhcmFtMScsXG4gICAgICBQYXJhbWV0ZXJWYWx1ZTogJ1ZhbHVlMScsXG4gICAgfSwge1xuICAgICAgUGFyYW1ldGVyS2V5OiAnUGFyYW0yJyxcbiAgICAgIFBhcmFtZXRlclZhbHVlOiAnVmFsdWUyJyxcbiAgICB9XSxcbiAgICBTdGFja0luc3RhbmNlc0dyb3VwOiBbe1xuICAgICAgUmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIERlcGxveW1lbnRUYXJnZXRzOiB7XG4gICAgICAgIEFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICB9LFxuICAgIH1dLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdzZWxmIG1hbmFnZWQgc3RhY2tzZXQgY3JlYXRlcyBhZG1pblJvbGUgYnkgZGVmYXVsdCcsICgpID0+IHtcbiAgY29uc3QgYXBwID0gbmV3IEFwcCgpO1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjayhhcHApO1xuXG4gIG5ldyBTdGFja1NldChzdGFjaywgJ1N0YWNrU2V0Jywge1xuICAgIHRhcmdldDogU3RhY2tTZXRUYXJnZXQuZnJvbUFjY291bnRzKHtcbiAgICAgIHJlZ2lvbnM6IFsndXMtZWFzdC0xJ10sXG4gICAgICBhY2NvdW50czogWycxMTExMTExMTExMSddLFxuICAgICAgcGFyYW1ldGVyT3ZlcnJpZGVzOiB7XG4gICAgICAgIFBhcmFtMTogJ1ZhbHVlMScsXG4gICAgICB9LFxuICAgIH0pLFxuICAgIHRlbXBsYXRlOiBTdGFja1NldFRlbXBsYXRlLmZyb21TdGFja1NldFN0YWNrKG5ldyBTdGFja1NldFN0YWNrKHN0YWNrLCAnU3RhY2snKSksXG4gIH0pO1xuXG4gIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNsb3VkRm9ybWF0aW9uOjpTdGFja1NldCcsIHtcbiAgICBNYW5hZ2VkRXhlY3V0aW9uOiB7IEFjdGl2ZTogdHJ1ZSB9LFxuICAgIFBlcm1pc3Npb25Nb2RlbDogJ1NFTEZfTUFOQUdFRCcsXG4gICAgQWRtaW5pc3RyYXRpb25Sb2xlQVJOOiB7ICdGbjo6R2V0QXR0JzogWydBZG1pblJvbGUzODU2M0M1NycsICdBcm4nXSB9LFxuICAgIFRlbXBsYXRlVVJMOiB7XG4gICAgICAnRm46OlN1Yic6ICdodHRwczovL3MzLiR7QVdTOjpSZWdpb259LiR7QVdTOjpVUkxTdWZmaXh9L2Nkay1obmI2NTlmZHMtYXNzZXRzLSR7QVdTOjpBY2NvdW50SWR9LSR7QVdTOjpSZWdpb259LzQ0MTM2ZmEzNTViMzY3OGExMTQ2YWQxNmY3ZTg2NDllOTRmYjRmYzIxZmU3N2U4MzEwYzA2MGY2MWNhYWZmOGEuanNvbicsXG4gICAgfSxcbiAgICBTdGFja0luc3RhbmNlc0dyb3VwOiBbe1xuICAgICAgUmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIERlcGxveW1lbnRUYXJnZXRzOiB7XG4gICAgICAgIEFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICB9LFxuICAgIH1dLFxuICB9KTtcbiAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpSb2xlJywge1xuICAgIEFzc3VtZVJvbGVQb2xpY3lEb2N1bWVudDoge1xuICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgIHtcbiAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgUHJpbmNpcGFsOiB7IFNlcnZpY2U6ICdjbG91ZGZvcm1hdGlvbi5hbWF6b25hd3MuY29tJyB9LFxuICAgICAgICAgIEFjdGlvbjogJ3N0czpBc3N1bWVSb2xlJyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG59KTtcblxudGVzdCgnc2VsZiBtYW5hZ2VkIHN0YWNrc2V0IHdpdGggZGlzYWJsZWQgcmVnaW9ucycsICgpID0+IHtcbiAgY29uc3QgYXBwID0gbmV3IEFwcCgpO1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjayhhcHApO1xuXG4gIG5ldyBTdGFja1NldChzdGFjaywgJ1N0YWNrU2V0Jywge1xuICAgIHRhcmdldDogU3RhY2tTZXRUYXJnZXQuZnJvbUFjY291bnRzKHtcbiAgICAgIHJlZ2lvbnM6IFsndXMtZWFzdC0xJywgJ2FmLXNvdXRoLTEnXSxcbiAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHtcbiAgICAgICAgUGFyYW0xOiAnVmFsdWUxJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgdGVtcGxhdGU6IFN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2sobmV3IFN0YWNrU2V0U3RhY2soc3RhY2ssICdTdGFjaycpKSxcbiAgfSk7XG5cbiAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q2xvdWRGb3JtYXRpb246OlN0YWNrU2V0Jywge1xuICAgIE1hbmFnZWRFeGVjdXRpb246IHsgQWN0aXZlOiB0cnVlIH0sXG4gICAgUGVybWlzc2lvbk1vZGVsOiAnU0VMRl9NQU5BR0VEJyxcbiAgICBBZG1pbmlzdHJhdGlvblJvbGVBUk46IHsgJ0ZuOjpHZXRBdHQnOiBbJ0FkbWluUm9sZTM4NTYzQzU3JywgJ0FybiddIH0sXG4gICAgVGVtcGxhdGVVUkw6IHtcbiAgICAgICdGbjo6U3ViJzogJ2h0dHBzOi8vczMuJHtBV1M6OlJlZ2lvbn0uJHtBV1M6OlVSTFN1ZmZpeH0vY2RrLWhuYjY1OWZkcy1hc3NldHMtJHtBV1M6OkFjY291bnRJZH0tJHtBV1M6OlJlZ2lvbn0vNDQxMzZmYTM1NWIzNjc4YTExNDZhZDE2ZjdlODY0OWU5NGZiNGZjMjFmZTc3ZTgzMTBjMDYwZjYxY2FhZmY4YS5qc29uJyxcbiAgICB9LFxuICAgIFN0YWNrSW5zdGFuY2VzR3JvdXA6IFt7XG4gICAgICBSZWdpb25zOiBbJ3VzLWVhc3QtMScsICdhZi1zb3V0aC0xJ10sXG4gICAgICBEZXBsb3ltZW50VGFyZ2V0czoge1xuICAgICAgICBBY2NvdW50czogWycxMTExMTExMTExMSddLFxuICAgICAgfSxcbiAgICB9XSxcbiAgfSk7XG4gIC8vIFNlcnZpY2UgcHJpbmNpcGFsIG5vdyB1c2VzIHBhcnRpdGlvbi1hd2FyZSBVUkwgc3VmZml4XG4gIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6Um9sZScsIHtcbiAgICBBc3N1bWVSb2xlUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICB7XG4gICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgIFByaW5jaXBhbDogeyBTZXJ2aWNlOiAnY2xvdWRmb3JtYXRpb24uYW1hem9uYXdzLmNvbScgfSxcbiAgICAgICAgICBBY3Rpb246ICdzdHM6QXNzdW1lUm9sZScsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgUHJpbmNpcGFsOiB7XG4gICAgICAgICAgICBTZXJ2aWNlOiB7XG4gICAgICAgICAgICAgICdGbjo6Sm9pbic6IFtcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAnY2xvdWRmb3JtYXRpb24uYWYtc291dGgtMS4nLFxuICAgICAgICAgICAgICAgICAgeyBSZWY6ICdBV1M6OlVSTFN1ZmZpeCcgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIEFjdGlvbjogJ3N0czpBc3N1bWVSb2xlJyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG59KTtcblxudGVzdCgnc2VydmljZSBtYW5hZ2VkIHN0YWNrc2V0JywgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHtcbiAgICAgICAgUGFyYW0xOiAnVmFsdWUxJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgZGVwbG95bWVudFR5cGU6IERlcGxveW1lbnRUeXBlLnNlcnZpY2VNYW5hZ2VkKCksXG4gICAgdGVtcGxhdGU6IFN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2sobmV3IFN0YWNrU2V0U3RhY2soc3RhY2ssICdTdGFjaycpKSxcbiAgfSk7XG5cbiAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q2xvdWRGb3JtYXRpb246OlN0YWNrU2V0Jywge1xuICAgIE1hbmFnZWRFeGVjdXRpb246IHsgQWN0aXZlOiB0cnVlIH0sXG4gICAgUGVybWlzc2lvbk1vZGVsOiAnU0VSVklDRV9NQU5BR0VEJyxcbiAgICBDYWxsQXM6ICdERUxFR0FURURfQURNSU4nLFxuICAgIEF1dG9EZXBsb3ltZW50OiB7XG4gICAgICBFbmFibGVkOiB0cnVlLFxuICAgICAgUmV0YWluU3RhY2tzT25BY2NvdW50UmVtb3ZhbDogdHJ1ZSxcbiAgICB9LFxuICAgIFRlbXBsYXRlVVJMOiB7XG4gICAgICAnRm46OlN1Yic6ICdodHRwczovL3MzLiR7QVdTOjpSZWdpb259LiR7QVdTOjpVUkxTdWZmaXh9L2Nkay1obmI2NTlmZHMtYXNzZXRzLSR7QVdTOjpBY2NvdW50SWR9LSR7QVdTOjpSZWdpb259LzQ0MTM2ZmEzNTViMzY3OGExMTQ2YWQxNmY3ZTg2NDllOTRmYjRmYzIxZmU3N2U4MzEwYzA2MGY2MWNhYWZmOGEuanNvbicsXG4gICAgfSxcbiAgICBTdGFja0luc3RhbmNlc0dyb3VwOiBbe1xuICAgICAgUGFyYW1ldGVyT3ZlcnJpZGVzOiBbe1xuICAgICAgICBQYXJhbWV0ZXJLZXk6ICdQYXJhbTEnLFxuICAgICAgICBQYXJhbWV0ZXJWYWx1ZTogJ1ZhbHVlMScsXG4gICAgICB9XSxcbiAgICAgIFJlZ2lvbnM6IFsndXMtZWFzdC0xJ10sXG4gICAgICBEZXBsb3ltZW50VGFyZ2V0czoge1xuICAgICAgICBBY2NvdW50czogWycxMTExMTExMTExMSddLFxuICAgICAgICBBY2NvdW50RmlsdGVyVHlwZTogJ0lOVEVSU0VDVElPTicsXG4gICAgICB9LFxuICAgIH1dLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdzZXJ2aWNlIG1hbmFnZWQgc3RhY2tzZXQgd2l0aCBvcHRpb25zJywgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHtcbiAgICAgICAgUGFyYW0xOiAnVmFsdWUxJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgZGVwbG95bWVudFR5cGU6IERlcGxveW1lbnRUeXBlLnNlcnZpY2VNYW5hZ2VkKHtcbiAgICAgIGRlbGVnYXRlZEFkbWluOiBmYWxzZSxcbiAgICAgIGF1dG9EZXBsb3lFbmFibGVkOiBmYWxzZSxcbiAgICB9KSxcbiAgICB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZS5mcm9tU3RhY2tTZXRTdGFjayhuZXcgU3RhY2tTZXRTdGFjayhzdGFjaywgJ1N0YWNrJykpLFxuICB9KTtcblxuICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZEZvcm1hdGlvbjo6U3RhY2tTZXQnLCB7XG4gICAgTWFuYWdlZEV4ZWN1dGlvbjogeyBBY3RpdmU6IHRydWUgfSxcbiAgICBQZXJtaXNzaW9uTW9kZWw6ICdTRVJWSUNFX01BTkFHRUQnLFxuICAgIENhbGxBczogJ1NFTEYnLFxuICAgIEF1dG9EZXBsb3ltZW50OiB7XG4gICAgICBFbmFibGVkOiBmYWxzZSxcbiAgICB9LFxuICAgIFRlbXBsYXRlVVJMOiB7XG4gICAgICAnRm46OlN1Yic6ICdodHRwczovL3MzLiR7QVdTOjpSZWdpb259LiR7QVdTOjpVUkxTdWZmaXh9L2Nkay1obmI2NTlmZHMtYXNzZXRzLSR7QVdTOjpBY2NvdW50SWR9LSR7QVdTOjpSZWdpb259LzQ0MTM2ZmEzNTViMzY3OGExMTQ2YWQxNmY3ZTg2NDllOTRmYjRmYzIxZmU3N2U4MzEwYzA2MGY2MWNhYWZmOGEuanNvbicsXG4gICAgfSxcbiAgICBTdGFja0luc3RhbmNlc0dyb3VwOiBbe1xuICAgICAgUmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIERlcGxveW1lbnRUYXJnZXRzOiB7XG4gICAgICAgIEFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICAgIEFjY291bnRGaWx0ZXJUeXBlOiAnSU5URVJTRUNUSU9OJyxcbiAgICAgIH0sXG4gICAgfV0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ3NlcnZpY2UgbWFuYWdlZCBzdGFja3NldCB0aHJvd3MgZXJyb3IgaWYgYXV0b0RlcGxveVJldGFpblN0YWNrcyBpcyBwcm92aWRlZCBhbmQgYXV0b0RlcGxveSBpcyBkaXNhYmxlZCcsICgpID0+IHtcbiAgY29uc3QgYXBwID0gbmV3IEFwcCgpO1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjayhhcHApO1xuXG4gIGV4cGVjdCgoKSA9PiB7XG4gICAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgICB0YXJnZXQ6IFN0YWNrU2V0VGFyZ2V0LmZyb21BY2NvdW50cyh7XG4gICAgICAgIHJlZ2lvbnM6IFsndXMtZWFzdC0xJ10sXG4gICAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICAgIHBhcmFtZXRlck92ZXJyaWRlczoge1xuICAgICAgICAgIFBhcmFtMTogJ1ZhbHVlMScsXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIGRlcGxveW1lbnRUeXBlOiBEZXBsb3ltZW50VHlwZS5zZXJ2aWNlTWFuYWdlZCh7XG4gICAgICAgIGRlbGVnYXRlZEFkbWluOiBmYWxzZSxcbiAgICAgICAgYXV0b0RlcGxveUVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBhdXRvRGVwbG95UmV0YWluU3RhY2tzOiB0cnVlLFxuICAgICAgfSksXG4gICAgICB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZS5mcm9tU3RhY2tTZXRTdGFjayhuZXcgU3RhY2tTZXRTdGFjayhzdGFjaywgJ1N0YWNrJykpLFxuICAgIH0pO1xuICB9KS50b1Rocm93KC9hdXRvRGVwbG95UmV0YWluU3RhY2tzIG9ubHkgYXBwbGllcyBpZiBhdXRvRGVwbG95IGlzIGVuYWJsZWQvKTtcbn0pO1xuXG50ZXN0KCdmcm9tT3JnYW5pemF0aW9ucyBkZWZhdWx0JywgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tT3JnYW5pemF0aW9uYWxVbml0cyh7XG4gICAgICByZWdpb25zOiBbJ3VzLWVhc3QtMSddLFxuICAgICAgb3JnYW5pemF0aW9uYWxVbml0czogWydvdS0xMTExMTExJ10sXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHtcbiAgICAgICAgUGFyYW0xOiAnVmFsdWUxJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgZGVwbG95bWVudFR5cGU6IERlcGxveW1lbnRUeXBlLnNlcnZpY2VNYW5hZ2VkKHtcbiAgICAgIGRlbGVnYXRlZEFkbWluOiBmYWxzZSxcbiAgICAgIGF1dG9EZXBsb3lFbmFibGVkOiBmYWxzZSxcbiAgICB9KSxcbiAgICB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZS5mcm9tU3RhY2tTZXRTdGFjayhuZXcgU3RhY2tTZXRTdGFjayhzdGFjaywgJ1N0YWNrJykpLFxuICB9KTtcblxuICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZEZvcm1hdGlvbjo6U3RhY2tTZXQnLCB7XG4gICAgTWFuYWdlZEV4ZWN1dGlvbjogeyBBY3RpdmU6IHRydWUgfSxcbiAgICBQZXJtaXNzaW9uTW9kZWw6ICdTRVJWSUNFX01BTkFHRUQnLFxuICAgIENhbGxBczogJ1NFTEYnLFxuICAgIEF1dG9EZXBsb3ltZW50OiB7XG4gICAgICBFbmFibGVkOiBmYWxzZSxcbiAgICB9LFxuICAgIFRlbXBsYXRlVVJMOiB7XG4gICAgICAnRm46OlN1Yic6ICdodHRwczovL3MzLiR7QVdTOjpSZWdpb259LiR7QVdTOjpVUkxTdWZmaXh9L2Nkay1obmI2NTlmZHMtYXNzZXRzLSR7QVdTOjpBY2NvdW50SWR9LSR7QVdTOjpSZWdpb259LzQ0MTM2ZmEzNTViMzY3OGExMTQ2YWQxNmY3ZTg2NDllOTRmYjRmYzIxZmU3N2U4MzEwYzA2MGY2MWNhYWZmOGEuanNvbicsXG4gICAgfSxcbiAgICBTdGFja0luc3RhbmNlc0dyb3VwOiBbe1xuICAgICAgUmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIERlcGxveW1lbnRUYXJnZXRzOiB7XG4gICAgICAgIEFjY291bnRGaWx0ZXJUeXBlOiAnTk9ORScsXG4gICAgICB9LFxuICAgIH1dLFxuICB9KTtcblxufSk7XG5cbnRlc3QoJ2hhcyBJQU0gY2FwYWJpbGl0aWVzJywgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHtcbiAgICAgICAgUGFyYW0xOiAnVmFsdWUxJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgdGVtcGxhdGU6IFN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2sobmV3IFN0YWNrU2V0U3RhY2soc3RhY2ssICdTdGFjaycpKSxcbiAgICBjYXBhYmlsaXRpZXM6IFtDYXBhYmlsaXR5LklBTSwgQ2FwYWJpbGl0eS5OQU1FRF9JQU1dLFxuICB9KTtcblxuICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpDbG91ZEZvcm1hdGlvbjo6U3RhY2tTZXQnLCB7XG4gICAgTWFuYWdlZEV4ZWN1dGlvbjogeyBBY3RpdmU6IHRydWUgfSxcbiAgICBQZXJtaXNzaW9uTW9kZWw6ICdTRUxGX01BTkFHRUQnLFxuICAgIFRlbXBsYXRlVVJMOiB7XG4gICAgICAnRm46OlN1Yic6ICdodHRwczovL3MzLiR7QVdTOjpSZWdpb259LiR7QVdTOjpVUkxTdWZmaXh9L2Nkay1obmI2NTlmZHMtYXNzZXRzLSR7QVdTOjpBY2NvdW50SWR9LSR7QVdTOjpSZWdpb259LzQ0MTM2ZmEzNTViMzY3OGExMTQ2YWQxNmY3ZTg2NDllOTRmYjRmYzIxZmU3N2U4MzEwYzA2MGY2MWNhYWZmOGEuanNvbicsXG4gICAgfSxcbiAgICBTdGFja0luc3RhbmNlc0dyb3VwOiBbe1xuICAgICAgUmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIERlcGxveW1lbnRUYXJnZXRzOiB7XG4gICAgICAgIEFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICB9LFxuICAgIH1dLFxuICAgIENhcGFiaWxpdGllczogW1xuICAgICAgJ0NBUEFCSUxJVFlfSUFNJyxcbiAgICAgICdDQVBBQklMSVRZX05BTUVEX0lBTScsXG4gICAgXSxcbiAgfSk7XG59KTtcblxudGVzdCgncmVxdWlyZXMgYXNzZXQgYnVja2V0IHRvIGJlIHBhc3NlZCcsICgpID0+IHtcbiAgY29uc3QgYXBwID0gbmV3IEFwcCgpO1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjayhhcHApO1xuXG4gIGV4cGVjdCgoKSA9PiB7XG4gICAgY29uc3QgbGFtYmRhU3RhY2sgPSBuZXcgTGFtYmRhU3RhY2tTZXQoc3RhY2ssICdMYW1iZGFTdGFjaycpO1xuICAgIG5ldyBTdGFja1NldChzdGFjaywgJ1N0YWNrU2V0Jywge1xuICAgICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgICByZWdpb25zOiBbJ3VzLWVhc3QtMSddLFxuICAgICAgICBhY2NvdW50czogWycxMTExMTExMTExMSddLFxuICAgICAgfSksXG4gICAgICB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZS5mcm9tU3RhY2tTZXRTdGFjayhuZXcgU3RhY2tTZXRTdGFjayhsYW1iZGFTdGFjaywgJ0xhbWJkYVN0YWNrJykpLFxuICAgICAgY2FwYWJpbGl0aWVzOiBbQ2FwYWJpbGl0eS5JQU0sIENhcGFiaWxpdHkuTkFNRURfSUFNXSxcbiAgICB9KTtcbiAgfSkudG9UaHJvdygnQW4gQXNzZXQgQnVja2V0IG11c3QgYmUgcHJvdmlkZWQgdG8gdXNlIEZpbGUgQXNzZXRzJyk7XG59KTtcblxudGVzdCgndGVzdCBsYW1iZGEgYXNzZXRzIHdpdGggb25lIGFzc2V0IGJ1Y2tldCcsICgpID0+IHtcbiAgY29uc3QgYXBwID0gbmV3IEFwcCh7XG4gICAgY29udGV4dDoge1xuICAgICAgW2N4YXBpLkFTU0VUX1JFU09VUkNFX01FVEFEQVRBX0VOQUJMRURfQ09OVEVYVF06IHRydWUsXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG4gIGNvbnN0IGxhbWJkYVN0YWNrID0gbmV3IExhbWJkYVN0YWNrU2V0KHN0YWNrLCAnTGFtYmRhU3RhY2snLCB7XG4gICAgYXNzZXRCdWNrZXRzOiBbczMuQnVja2V0LmZyb21CdWNrZXROYW1lKHN0YWNrLCAnQXNzZXRCdWNrZXQnLCAnaW50ZWctYXNzZXRzJyldLFxuICAgIGFzc2V0QnVja2V0UHJlZml4OiAncHJlZml4JyxcbiAgfSk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHtcbiAgICAgICAgUGFyYW0xOiAnVmFsdWUxJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgdGVtcGxhdGU6IFN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2sobGFtYmRhU3RhY2spLFxuICAgIGNhcGFiaWxpdGllczogW0NhcGFiaWxpdHkuSUFNLCBDYXBhYmlsaXR5Lk5BTUVEX0lBTV0sXG4gIH0pO1xuXG4gIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykucmVzb3VyY2VDb3VudElzKCdDdXN0b206OkNES0J1Y2tldERlcGxveW1lbnQnLCAxKTtcbn0pO1xuXG50ZXN0KCd0ZXN0IGxhbWJkYSBhc3NldHMgd2l0aCB0d28gYXNzZXQgYnVja2V0cycsICgpID0+IHtcbiAgY29uc3QgYXBwID0gbmV3IEFwcCh7XG4gICAgY29udGV4dDoge1xuICAgICAgW2N4YXBpLkFTU0VUX1JFU09VUkNFX01FVEFEQVRBX0VOQUJMRURfQ09OVEVYVF06IHRydWUsXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG4gIGNvbnN0IGxhbWJkYVN0YWNrID0gbmV3IExhbWJkYVN0YWNrU2V0KHN0YWNrLCAnTGFtYmRhU3RhY2snLCB7XG4gICAgYXNzZXRCdWNrZXRzOiBbczMuQnVja2V0LmZyb21CdWNrZXROYW1lKHN0YWNrLCAnQXNzZXRCdWNrZXQnLCAnaW50ZWctYXNzZXRzJyksIHMzLkJ1Y2tldC5mcm9tQnVja2V0TmFtZShzdGFjaywgJ0Fzc2V0QnVja2V0MicsICdpbnRlZy1hc3NldHMyJyldLFxuICAgIGFzc2V0QnVja2V0UHJlZml4OiAncHJlZml4JyxcbiAgfSk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHtcbiAgICAgICAgUGFyYW0xOiAnVmFsdWUxJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgdGVtcGxhdGU6IFN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2sobGFtYmRhU3RhY2spLFxuICAgIGNhcGFiaWxpdGllczogW0NhcGFiaWxpdHkuSUFNLCBDYXBhYmlsaXR5Lk5BTUVEX0lBTV0sXG4gIH0pO1xuXG4gIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykucmVzb3VyY2VDb3VudElzKCdDdXN0b206OkNES0J1Y2tldERlcGxveW1lbnQnLCAyKTtcbn0pO1xuXG50ZXN0KCdwYXNzZXMgb3BlcmF0aW9uIHByZWZlcmVuY2VzJywgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHtcbiAgICAgICAgUGFyYW0xOiAnVmFsdWUxJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgdGVtcGxhdGU6IFN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2sobmV3IFN0YWNrU2V0U3RhY2soc3RhY2ssICdTdGFjaycpKSxcbiAgICBvcGVyYXRpb25QcmVmZXJlbmNlczoge1xuICAgICAgLy8gSW4gcmVhbGl0eSwgeW91IHdvdWxkIG5vdCBzZXQgYWxsIG9mIHRoZXNlIGF0IG9uY2UsIGJ1dCBpdCBhbGxvd3MgdXMgdG8gdGVzdCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gb25lIHRlc3QgY2FzZVxuICAgICAgcmVnaW9uQ29uY3VycmVuY3lUeXBlOiBSZWdpb25Db25jdXJyZW5jeVR5cGUuUEFSQUxMRUwsXG4gICAgICByZWdpb25PcmRlcjogWyd1cy1lYXN0LTEnLCAndXMtd2VzdC0yJ10sXG4gICAgICBtYXhDb25jdXJyZW50UGVyY2VudGFnZTogNTAsXG4gICAgICBtYXhDb25jdXJyZW50Q291bnQ6IDUsXG4gICAgICBmYWlsdXJlVG9sZXJhbmNlUGVyY2VudGFnZTogMTAsXG4gICAgICBmYWlsdXJlVG9sZXJhbmNlQ291bnQ6IDEsXG4gICAgfSxcbiAgfSk7XG5cbiAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q2xvdWRGb3JtYXRpb246OlN0YWNrU2V0Jywge1xuICAgIE1hbmFnZWRFeGVjdXRpb246IHsgQWN0aXZlOiB0cnVlIH0sXG4gICAgUGVybWlzc2lvbk1vZGVsOiAnU0VMRl9NQU5BR0VEJyxcbiAgICBPcGVyYXRpb25QcmVmZXJlbmNlczoge1xuICAgICAgUmVnaW9uQ29uY3VycmVuY3lUeXBlOiAnUEFSQUxMRUwnLFxuICAgICAgUmVnaW9uT3JkZXI6IFsndXMtZWFzdC0xJywgJ3VzLXdlc3QtMiddLFxuICAgICAgTWF4Q29uY3VycmVudFBlcmNlbnRhZ2U6IDUwLFxuICAgICAgTWF4Q29uY3VycmVudENvdW50OiA1LFxuICAgICAgRmFpbHVyZVRvbGVyYW5jZVBlcmNlbnRhZ2U6IDEwLFxuICAgICAgRmFpbHVyZVRvbGVyYW5jZUNvdW50OiAxLFxuICAgIH0sXG4gICAgVGVtcGxhdGVVUkw6IHtcbiAgICAgICdGbjo6U3ViJzogJ2h0dHBzOi8vczMuJHtBV1M6OlJlZ2lvbn0uJHtBV1M6OlVSTFN1ZmZpeH0vY2RrLWhuYjY1OWZkcy1hc3NldHMtJHtBV1M6OkFjY291bnRJZH0tJHtBV1M6OlJlZ2lvbn0vNDQxMzZmYTM1NWIzNjc4YTExNDZhZDE2ZjdlODY0OWU5NGZiNGZjMjFmZTc3ZTgzMTBjMDYwZjYxY2FhZmY4YS5qc29uJyxcbiAgICB9LFxuICAgIFN0YWNrSW5zdGFuY2VzR3JvdXA6IFt7XG4gICAgICBSZWdpb25zOiBbJ3VzLWVhc3QtMSddLFxuICAgICAgRGVwbG95bWVudFRhcmdldHM6IHtcbiAgICAgICAgQWNjb3VudHM6IFsnMTExMTExMTExMTEnXSxcbiAgICAgIH0sXG4gICAgfV0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ3NlbGYgbWFuYWdlZCBzdGFja3NldCB1c2VzIHBhcnRpdGlvbi1hd2FyZSBBUk4gZm9yIGV4ZWN1dGlvbiByb2xlJywgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnXSxcbiAgICAgIGFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gICAgfSksXG4gICAgdGVtcGxhdGU6IFN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2sobmV3IFN0YWNrU2V0U3RhY2soc3RhY2ssICdTdGFjaycpKSxcbiAgfSk7XG5cbiAgLy8gRm9yIGVudi1hZ25vc3RpYyBzdGFja3MsIGZvcm1hdEFybiBwcm9kdWNlcyBhIEZuOjpKb2luIHdpdGggQVdTOjpQYXJ0aXRpb25cbiAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XG4gICAgUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICB7XG4gICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgIEFjdGlvbjogJ3N0czpBc3N1bWVSb2xlJyxcbiAgICAgICAgICBSZXNvdXJjZToge1xuICAgICAgICAgICAgJ0ZuOjpKb2luJzogW1xuICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICdhcm46JyxcbiAgICAgICAgICAgICAgICB7IFJlZjogJ0FXUzo6UGFydGl0aW9uJyB9LFxuICAgICAgICAgICAgICAgICc6aWFtOjoqOnJvbGUvQVdTQ2xvdWRGb3JtYXRpb25TdGFja1NldEV4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9KTtcbn0pO1xuXG50ZXN0KCdzZWxmIG1hbmFnZWQgc3RhY2tzZXQgd2l0aCBjdXN0b20gZXhlY3V0aW9uIHJvbGUgbmFtZSB1c2VzIHBhcnRpdGlvbi1hd2FyZSBBUk4nLCAoKSA9PiB7XG4gIGNvbnN0IGFwcCA9IG5ldyBBcHAoKTtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soYXBwKTtcblxuICBuZXcgU3RhY2tTZXQoc3RhY2ssICdTdGFja1NldCcsIHtcbiAgICB0YXJnZXQ6IFN0YWNrU2V0VGFyZ2V0LmZyb21BY2NvdW50cyh7XG4gICAgICByZWdpb25zOiBbJ3VzLWVhc3QtMSddLFxuICAgICAgYWNjb3VudHM6IFsnMTExMTExMTExMTEnXSxcbiAgICB9KSxcbiAgICB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZS5mcm9tU3RhY2tTZXRTdGFjayhuZXcgU3RhY2tTZXRTdGFjayhzdGFjaywgJ1N0YWNrJykpLFxuICAgIGRlcGxveW1lbnRUeXBlOiBEZXBsb3ltZW50VHlwZS5zZWxmTWFuYWdlZCh7XG4gICAgICBleGVjdXRpb25Sb2xlTmFtZTogJ0N1c3RvbUV4ZWN1dGlvblJvbGUnLFxuICAgIH0pLFxuICB9KTtcblxuICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgIHtcbiAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgQWN0aW9uOiAnc3RzOkFzc3VtZVJvbGUnLFxuICAgICAgICAgIFJlc291cmNlOiB7XG4gICAgICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgJ2FybjonLFxuICAgICAgICAgICAgICAgIHsgUmVmOiAnQVdTOjpQYXJ0aXRpb24nIH0sXG4gICAgICAgICAgICAgICAgJzppYW06Oio6cm9sZS9DdXN0b21FeGVjdXRpb25Sb2xlJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG59KTtcblxudGVzdCgnc2VsZiBtYW5hZ2VkIHN0YWNrc2V0IHdpdGggZGlzYWJsZWQgcmVnaW9ucyB1c2VzIHBhcnRpdGlvbi1hd2FyZSBVUkwgc3VmZml4JywgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1lYXN0LTEnLCAnYWYtc291dGgtMSddLFxuICAgICAgYWNjb3VudHM6IFsnMTExMTExMTExMTEnXSxcbiAgICB9KSxcbiAgICB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZS5mcm9tU3RhY2tTZXRTdGFjayhuZXcgU3RhY2tTZXRTdGFjayhzdGFjaywgJ1N0YWNrJykpLFxuICB9KTtcblxuICAvLyBGb3IgZW52LWFnbm9zdGljIHN0YWNrcywgdXJsU3VmZml4IHByb2R1Y2VzIEFXUzo6VVJMU3VmZml4IHJlZmVyZW5jZVxuICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlJvbGUnLCB7XG4gICAgQXNzdW1lUm9sZVBvbGljeURvY3VtZW50OiB7XG4gICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAge1xuICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICBQcmluY2lwYWw6IHsgU2VydmljZTogJ2Nsb3VkZm9ybWF0aW9uLmFtYXpvbmF3cy5jb20nIH0sXG4gICAgICAgICAgQWN0aW9uOiAnc3RzOkFzc3VtZVJvbGUnLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgIFByaW5jaXBhbDoge1xuICAgICAgICAgICAgU2VydmljZToge1xuICAgICAgICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICAgJ2Nsb3VkZm9ybWF0aW9uLmFmLXNvdXRoLTEuJyxcbiAgICAgICAgICAgICAgICAgIHsgUmVmOiAnQVdTOjpVUkxTdWZmaXgnIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBBY3Rpb246ICdzdHM6QXNzdW1lUm9sZScsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ0dvdkNsb3VkIHBhcnRpdGlvbiAtIHNlbGYgbWFuYWdlZCBzdGFja3NldCB3aXRoIHNwZWNpZmljIGVudmlyb25tZW50JywgKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKCk7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycsIHtcbiAgICBlbnY6IHtcbiAgICAgIGFjY291bnQ6ICcxMTExMTExMTExMTEnLFxuICAgICAgcmVnaW9uOiAndXMtZ292LXdlc3QtMScsXG4gICAgfSxcbiAgfSk7XG5cbiAgbmV3IFN0YWNrU2V0KHN0YWNrLCAnU3RhY2tTZXQnLCB7XG4gICAgdGFyZ2V0OiBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHMoe1xuICAgICAgcmVnaW9uczogWyd1cy1nb3Ytd2VzdC0xJ10sXG4gICAgICBhY2NvdW50czogWycxMTExMTExMTExMSddLFxuICAgIH0pLFxuICAgIHRlbXBsYXRlOiBTdGFja1NldFRlbXBsYXRlLmZyb21TdGFja1NldFN0YWNrKG5ldyBTdGFja1NldFN0YWNrKHN0YWNrLCAnU3RhY2snKSksXG4gIH0pO1xuXG4gIC8vIFZlcmlmeSB0aGF0IHRoZSBBUk4gdXNlcyBBV1M6OlBhcnRpdGlvbiB3aGljaCB3aWxsIGNvcnJlY3RseSByZXNvbHZlIHRvIGF3cy11cy1nb3YgYXQgZGVwbG95bWVudCB0aW1lXG4gIC8vIENESydzIGZvcm1hdEFybiBwcm9kdWNlcyBGbjo6Sm9pbiB3aXRoIEFXUzo6UGFydGl0aW9uIHJlZmVyZW5jZSBldmVuIHdpdGggc3BlY2lmaWMgZW52XG4gIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAge1xuICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICBBY3Rpb246ICdzdHM6QXNzdW1lUm9sZScsXG4gICAgICAgICAgUmVzb3VyY2U6IHtcbiAgICAgICAgICAgICdGbjo6Sm9pbic6IFtcbiAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAnYXJuOicsXG4gICAgICAgICAgICAgICAgeyBSZWY6ICdBV1M6OlBhcnRpdGlvbicgfSxcbiAgICAgICAgICAgICAgICAnOmlhbTo6Kjpyb2xlL0FXU0Nsb3VkRm9ybWF0aW9uU3RhY2tTZXRFeGVjdXRpb25Sb2xlJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG59KTsiXX0=