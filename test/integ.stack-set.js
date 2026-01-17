"use strict";
/// !cdk-integ *
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportStack = void 0;
const path = __importStar(require("path"));
const integ_tests_alpha_1 = require("@aws-cdk/integ-tests-alpha");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const stacksets = __importStar(require("../src"));
/**
 * It's a little difficult to create an integration test for stacksets since it requires
 * multiple accounts. So the requirements for running this test are:
 *
 * - 2 accounts:
 *  - A "deployment" account which will be the account that the test case runs in and
 *    deploys the stackset
 *  - A "target" account which is where the stackset will deploy into
 *
 * - The target account must be bootstrapped to trust the deployment account
 * - The below environment variables must be set appropriately
 */
const deploymentAccount = process.env.CDK_INTEG_ACCOUNT ?? process.env.INTEG_DEPLOYMENT_ACCOUNT ?? process.env.CDK_DEFAULT_ACCOUNT;
const targetAccount = process.env.CDK_INTEG_ACCOUNT ?? process.env.INTEG_TARGET_ACCOUNT;
const targetRegion = process.env.INTEG_TARGET_REGION ?? 'us-east-1';
const executionRoleName = 'AWSCloudFormationStackSetExecutionRole-integ-test';
const adminRoleName = 'AWSCloudFormationStackSetAdministrationRole-integ-test';
const app = new aws_cdk_lib_1.App({
    postCliContext: {
        // I don't know why this is needed, but If I don't have it I get
        // an error about undefined not being a list
        '@aws-cdk/core:target-partitions': ['aws', 'aws-us-gov'],
    },
});
/**
 * Create the execution role in the target account first.
 * This is the role that CloudFormation will use (comparable to the cfn-exec bootstrap role)
 */
class SupportStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.executionRole = new aws_cdk_lib_1.aws_iam.Role(this, 'CfnExecutionRole', {
            roleName: executionRoleName,
            assumedBy: new aws_cdk_lib_1.aws_iam.ArnPrincipal(`arn:aws:iam::${deploymentAccount}:root`),
            managedPolicies: [
                aws_cdk_lib_1.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
            ],
        });
    }
}
exports.SupportStack = SupportStack;
/**
 * Create a StackSetStack which just creates a simple SNS topic
 */
class MyStackSet extends stacksets.StackSetStack {
    constructor(scope, id) {
        super(scope, id);
        new aws_cdk_lib_1.aws_sns.Topic(this, 'IntegStackSetSNSTopic');
    }
}
/**
 * Create a StackSetStack that has file assets
 */
class LambdaStackSet extends stacksets.StackSetStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        new aws_cdk_lib_1.aws_lambda.Function(this, 'Lambda', {
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_16_X,
            handler: 'index.handler',
            code: aws_cdk_lib_1.aws_lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
        });
    }
}
/**
 * Create the stack which will create the StackSet resource
 */
class TestCase extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const adminRole = new aws_cdk_lib_1.aws_iam.Role(this, 'AdminRole', {
            roleName: adminRoleName,
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal('cloudformation.amazonaws.com'),
            inlinePolicies: {
                AssumeExecutionRole: new aws_cdk_lib_1.aws_iam.PolicyDocument({
                    statements: [
                        new aws_cdk_lib_1.aws_iam.PolicyStatement({
                            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
                            actions: ['sts:AssumeRole'],
                            resources: [
                                `arn:aws:iam::*:role/${executionRoleName}`,
                            ],
                        }),
                    ],
                }),
            },
        });
        const stackSetStack = new MyStackSet(this, 'integ-stack-set');
        new stacksets.StackSet(this, 'StackSet', {
            target: stacksets.StackSetTarget.fromAccounts({
                accounts: [targetAccount],
                regions: [targetRegion],
            }),
            template: stacksets.StackSetTemplate.fromStackSetStack(stackSetStack),
            deploymentType: stacksets.DeploymentType.selfManaged({
                executionRoleName: props.executionRole.roleName,
                adminRole,
            }),
        });
    }
}
/**
 * Create the stack which will create the StackSet resource
 */
class AssetTestCase extends aws_cdk_lib_1.Stack {
    constructor(scope, id) {
        super(scope, id);
        const stackSetStack = new LambdaStackSet(this, 'asset-stack-set', {
            assetBuckets: [aws_cdk_lib_1.aws_s3.Bucket.fromBucketName(this, 'AssetBucket', 'integ-assets')],
            assetBucketPrefix: 'asset-bucket',
        });
        new stacksets.StackSet(this, 'StackSet', {
            target: stacksets.StackSetTarget.fromAccounts({
                accounts: [targetAccount],
                regions: [targetRegion],
            }),
            template: stacksets.StackSetTemplate.fromStackSetStack(stackSetStack),
            deploymentType: stacksets.DeploymentType.serviceManaged({ delegatedAdmin: false }),
        });
    }
}
const supportStack = new SupportStack(app, 'integ-stack-set-support', {
    env: {
        account: targetAccount,
        region: targetRegion,
    },
});
const testCase = new TestCase(app, 'integ-stackset-test', {
    env: {
        account: deploymentAccount,
        region: process.env.CDK_INTEG_REGION ?? process.env.CDK_DEFAULT_REGION,
    },
    executionRole: supportStack.executionRole,
});
testCase.addDependency(supportStack);
const assetTestCase = new AssetTestCase(app, 'integ-stackset-asset-test');
new integ_tests_alpha_1.IntegTest(app, 'integ-test', {
    testCases: [testCase, assetTestCase],
    enableLookups: true,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuc3RhY2stc2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW50ZWcuc3RhY2stc2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxnQkFBZ0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRWhCLDJDQUE2QjtBQUM3QixrRUFBdUQ7QUFDdkQsNkNBUXFCO0FBRXJCLGtEQUFvQztBQUVwQzs7Ozs7Ozs7Ozs7R0FXRztBQUVILE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUM7QUFDbkksTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDO0FBQ3hGLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksV0FBVyxDQUFDO0FBQ3BFLE1BQU0saUJBQWlCLEdBQUcsbURBQW1ELENBQUM7QUFDOUUsTUFBTSxhQUFhLEdBQUcsd0RBQXdELENBQUM7QUFFL0UsTUFBTSxHQUFHLEdBQUcsSUFBSSxpQkFBRyxDQUFDO0lBQ2xCLGNBQWMsRUFBRTtRQUNkLGdFQUFnRTtRQUNoRSw0Q0FBNEM7UUFDNUMsaUNBQWlDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDO0tBQ3pEO0NBQ0YsQ0FBQyxDQUFDO0FBRUg7OztHQUdHO0FBQ0gsTUFBYSxZQUFhLFNBQVEsbUJBQUs7SUFFckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQjtRQUMxRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUkscUJBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFF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LEVBQUUsWUFBWSxDQUFDLGFBQWE7Q0FDMUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUVyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxHQUFHLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztBQUUxRSxJQUFJLDZCQUFTLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRTtJQUMvQixTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDO0lBQ3BDLGFBQWEsRUFBRSxJQUFJO0NBQ3BCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyAhY2RrLWludGVnICpcblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEludGVnVGVzdCB9IGZyb20gJ0Bhd3MtY2RrL2ludGVnLXRlc3RzLWFscGhhJztcbmltcG9ydCB7XG4gIEFwcCxcbiAgU3RhY2ssXG4gIFN0YWNrUHJvcHMsXG4gIGF3c19zbnMgYXMgc25zLFxuICBhd3NfaWFtIGFzIGlhbSxcbiAgYXdzX2xhbWJkYSBhcyBsYW1iZGEsXG4gIGF3c19zMyBhcyBzMyxcbn0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBzdGFja3NldHMgZnJvbSAnLi4vc3JjJztcblxuLyoqXG4gKiBJdCdzIGEgbGl0dGxlIGRpZmZpY3VsdCB0byBjcmVhdGUgYW4gaW50ZWdyYXRpb24gdGVzdCBmb3Igc3RhY2tzZXRzIHNpbmNlIGl0IHJlcXVpcmVzXG4gKiBtdWx0aXBsZSBhY2NvdW50cy4gU28gdGhlIHJlcXVpcmVtZW50cyBmb3IgcnVubmluZyB0aGlzIHRlc3QgYXJlOlxuICpcbiAqIC0gMiBhY2NvdW50czpcbiAqICAtIEEgXCJkZXBsb3ltZW50XCIgYWNjb3VudCB3aGljaCB3aWxsIGJlIHRoZSBhY2NvdW50IHRoYXQgdGhlIHRlc3QgY2FzZSBydW5zIGluIGFuZFxuICogICAgZGVwbG95cyB0aGUgc3RhY2tzZXRcbiAqICAtIEEgXCJ0YXJnZXRcIiBhY2NvdW50IHdoaWNoIGlzIHdoZXJlIHRoZSBzdGFja3NldCB3aWxsIGRlcGxveSBpbnRvXG4gKlxuICogLSBUaGUgdGFyZ2V0IGFjY291bnQgbXVzdCBiZSBib290c3RyYXBwZWQgdG8gdHJ1c3QgdGhlIGRlcGxveW1lbnQgYWNjb3VudFxuICogLSBUaGUgYmVsb3cgZW52aXJvbm1lbnQgdmFyaWFibGVzIG11c3QgYmUgc2V0IGFwcHJvcHJpYXRlbHlcbiAqL1xuXG5jb25zdCBkZXBsb3ltZW50QWNjb3VudCA9IHByb2Nlc3MuZW52LkNES19JTlRFR19BQ0NPVU5UID8/IHByb2Nlc3MuZW52LklOVEVHX0RFUExPWU1FTlRfQUNDT1VOVCA/PyBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5UO1xuY29uc3QgdGFyZ2V0QWNjb3VudCA9IHByb2Nlc3MuZW52LkNES19JTlRFR19BQ0NPVU5UID8/IHByb2Nlc3MuZW52LklOVEVHX1RBUkdFVF9BQ0NPVU5UO1xuY29uc3QgdGFyZ2V0UmVnaW9uID0gcHJvY2Vzcy5lbnYuSU5URUdfVEFSR0VUX1JFR0lPTiA/PyAndXMtZWFzdC0xJztcbmNvbnN0IGV4ZWN1dGlvblJvbGVOYW1lID0gJ0FXU0Nsb3VkRm9ybWF0aW9uU3RhY2tTZXRFeGVjdXRpb25Sb2xlLWludGVnLXRlc3QnO1xuY29uc3QgYWRtaW5Sb2xlTmFtZSA9ICdBV1NDbG91ZEZvcm1hdGlvblN0YWNrU2V0QWRtaW5pc3RyYXRpb25Sb2xlLWludGVnLXRlc3QnO1xuXG5jb25zdCBhcHAgPSBuZXcgQXBwKHtcbiAgcG9zdENsaUNvbnRleHQ6IHtcbiAgICAvLyBJIGRvbid0IGtub3cgd2h5IHRoaXMgaXMgbmVlZGVkLCBidXQgSWYgSSBkb24ndCBoYXZlIGl0IEkgZ2V0XG4gICAgLy8gYW4gZXJyb3IgYWJvdXQgdW5kZWZpbmVkIG5vdCBiZWluZyBhIGxpc3RcbiAgICAnQGF3cy1jZGsvY29yZTp0YXJnZXQtcGFydGl0aW9ucyc6IFsnYXdzJywgJ2F3cy11cy1nb3YnXSxcbiAgfSxcbn0pO1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgZXhlY3V0aW9uIHJvbGUgaW4gdGhlIHRhcmdldCBhY2NvdW50IGZpcnN0LlxuICogVGhpcyBpcyB0aGUgcm9sZSB0aGF0IENsb3VkRm9ybWF0aW9uIHdpbGwgdXNlIChjb21wYXJhYmxlIHRvIHRoZSBjZm4tZXhlYyBib290c3RyYXAgcm9sZSlcbiAqL1xuZXhwb3J0IGNsYXNzIFN1cHBvcnRTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGV4ZWN1dGlvblJvbGU6IGlhbS5JUm9sZTtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLmV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0NmbkV4ZWN1dGlvblJvbGUnLCB7XG4gICAgICByb2xlTmFtZTogZXhlY3V0aW9uUm9sZU5hbWUsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQXJuUHJpbmNpcGFsKGBhcm46YXdzOmlhbTo6JHtkZXBsb3ltZW50QWNjb3VudH06cm9vdGApLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQWRtaW5pc3RyYXRvckFjY2VzcycpLFxuICAgICAgXSxcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIFN0YWNrU2V0U3RhY2sgd2hpY2gganVzdCBjcmVhdGVzIGEgc2ltcGxlIFNOUyB0b3BpY1xuICovXG5jbGFzcyBNeVN0YWNrU2V0IGV4dGVuZHMgc3RhY2tzZXRzLlN0YWNrU2V0U3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIG5ldyBzbnMuVG9waWModGhpcywgJ0ludGVnU3RhY2tTZXRTTlNUb3BpYycpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgU3RhY2tTZXRTdGFjayB0aGF0IGhhcyBmaWxlIGFzc2V0c1xuICovXG5jbGFzcyBMYW1iZGFTdGFja1NldCBleHRlbmRzIHN0YWNrc2V0cy5TdGFja1NldFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBzdGFja3NldHMuU3RhY2tTZXRTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTZfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGFtYmRhJykpLFxuICAgIH0pO1xuICB9XG59XG5cbmludGVyZmFjZSBUZXN0Q2FzZVByb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gIGV4ZWN1dGlvblJvbGU6IGlhbS5JUm9sZTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIHN0YWNrIHdoaWNoIHdpbGwgY3JlYXRlIHRoZSBTdGFja1NldCByZXNvdXJjZVxuICovXG5jbGFzcyBUZXN0Q2FzZSBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFRlc3RDYXNlUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICBjb25zdCBhZG1pblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FkbWluUm9sZScsIHtcbiAgICAgIHJvbGVOYW1lOiBhZG1pblJvbGVOYW1lLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkZm9ybWF0aW9uLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIEFzc3VtZUV4ZWN1dGlvblJvbGU6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbJ3N0czpBc3N1bWVSb2xlJ10sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIGBhcm46YXdzOmlhbTo6Kjpyb2xlLyR7ZXhlY3V0aW9uUm9sZU5hbWV9YCxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBjb25zdCBzdGFja1NldFN0YWNrID0gbmV3IE15U3RhY2tTZXQodGhpcywgJ2ludGVnLXN0YWNrLXNldCcpO1xuICAgIG5ldyBzdGFja3NldHMuU3RhY2tTZXQodGhpcywgJ1N0YWNrU2V0Jywge1xuICAgICAgdGFyZ2V0OiBzdGFja3NldHMuU3RhY2tTZXRUYXJnZXQuZnJvbUFjY291bnRzKHtcbiAgICAgICAgYWNjb3VudHM6IFt0YXJnZXRBY2NvdW50IV0sXG4gICAgICAgIHJlZ2lvbnM6IFt0YXJnZXRSZWdpb25dLFxuICAgICAgfSksXG4gICAgICB0ZW1wbGF0ZTogc3RhY2tzZXRzLlN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2soc3RhY2tTZXRTdGFjayksXG4gICAgICBkZXBsb3ltZW50VHlwZTogc3RhY2tzZXRzLkRlcGxveW1lbnRUeXBlLnNlbGZNYW5hZ2VkKHtcbiAgICAgICAgZXhlY3V0aW9uUm9sZU5hbWU6IHByb3BzLmV4ZWN1dGlvblJvbGUucm9sZU5hbWUsXG4gICAgICAgIGFkbWluUm9sZSxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIHN0YWNrIHdoaWNoIHdpbGwgY3JlYXRlIHRoZSBTdGFja1NldCByZXNvdXJjZVxuICovXG5jbGFzcyBBc3NldFRlc3RDYXNlIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHN0YWNrU2V0U3RhY2sgPSBuZXcgTGFtYmRhU3RhY2tTZXQodGhpcywgJ2Fzc2V0LXN0YWNrLXNldCcsIHtcbiAgICAgIGFzc2V0QnVja2V0czogW3MzLkJ1Y2tldC5mcm9tQnVja2V0TmFtZSh0aGlzLCAnQXNzZXRCdWNrZXQnLCAnaW50ZWctYXNzZXRzJyldLFxuICAgICAgYXNzZXRCdWNrZXRQcmVmaXg6ICdhc3NldC1idWNrZXQnLFxuICAgIH0pO1xuICAgIG5ldyBzdGFja3NldHMuU3RhY2tTZXQodGhpcywgJ1N0YWNrU2V0Jywge1xuICAgICAgdGFyZ2V0OiBzdGFja3NldHMuU3RhY2tTZXRUYXJnZXQuZnJvbUFjY291bnRzKHtcbiAgICAgICAgYWNjb3VudHM6IFt0YXJnZXRBY2NvdW50IV0sXG4gICAgICAgIHJlZ2lvbnM6IFt0YXJnZXRSZWdpb25dLFxuICAgICAgfSksXG4gICAgICB0ZW1wbGF0ZTogc3RhY2tzZXRzLlN0YWNrU2V0VGVtcGxhdGUuZnJvbVN0YWNrU2V0U3RhY2soc3RhY2tTZXRTdGFjayksXG4gICAgICBkZXBsb3ltZW50VHlwZTogc3RhY2tzZXRzLkRlcGxveW1lbnRUeXBlLnNlcnZpY2VNYW5hZ2VkKHsgZGVsZWdhdGVkQWRtaW46IGZhbHNlIH0pLFxuICAgIH0pO1xuXG4gIH1cbn1cblxuY29uc3Qgc3VwcG9ydFN0YWNrID0gbmV3IFN1cHBvcnRTdGFjayhhcHAsICdpbnRlZy1zdGFjay1zZXQtc3VwcG9ydCcsIHtcbiAgZW52OiB7XG4gICAgYWNjb3VudDogdGFyZ2V0QWNjb3VudCxcbiAgICByZWdpb246IHRhcmdldFJlZ2lvbixcbiAgfSxcbn0pO1xuXG5jb25zdCB0ZXN0Q2FzZSA9IG5ldyBUZXN0Q2FzZShhcHAsICdpbnRlZy1zdGFja3NldC10ZXN0Jywge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBkZXBsb3ltZW50QWNjb3VudCxcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19JTlRFR19SRUdJT04gPz8gcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OLFxuICB9LFxuICBleGVjdXRpb25Sb2xlOiBzdXBwb3J0U3RhY2suZXhlY3V0aW9uUm9sZSxcbn0pO1xuXG50ZXN0Q2FzZS5hZGREZXBlbmRlbmN5KHN1cHBvcnRTdGFjayk7XG5cbmNvbnN0IGFzc2V0VGVzdENhc2UgPSBuZXcgQXNzZXRUZXN0Q2FzZShhcHAsICdpbnRlZy1zdGFja3NldC1hc3NldC10ZXN0Jyk7XG5cbm5ldyBJbnRlZ1Rlc3QoYXBwLCAnaW50ZWctdGVzdCcsIHtcbiAgdGVzdENhc2VzOiBbdGVzdENhc2UsIGFzc2V0VGVzdENhc2VdLFxuICBlbmFibGVMb29rdXBzOiB0cnVlLFxufSk7XG4iXX0=