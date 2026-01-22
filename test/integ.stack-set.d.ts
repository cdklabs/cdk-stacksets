import { Stack, StackProps, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';
/**
 * Create the execution role in the target account first.
 * This is the role that CloudFormation will use (comparable to the cfn-exec bootstrap role)
 */
export declare class SupportStack extends Stack {
    readonly executionRole: iam.IRole;
    constructor(scope: Construct, id: string, props?: StackProps);
}
