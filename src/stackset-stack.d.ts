import { Stack, StackSynthesizer, FileAssetSource, FileAssetLocation, DockerImageAssetLocation, DockerImageAssetSource, ISynthesisSession } from 'aws-cdk-lib';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
export declare const fileAssetResourceNames: string[];
/**
 * Deployment environment for an AWS StackSet stack.
 *
 * Interoperates with the StackSynthesizer of the parent stack.
 */
export declare class StackSetStackSynthesizer extends StackSynthesizer {
    /**
     * An array of Buckets can be passed to store assets, enabling StackSetStack Asset support
     *
     * One Bucket is required per target region. The name must be `${assetBucketPrefix}-<region>`, where
     * `<region>` is the region targeted by the StackSet.
     *
     * @default - No Buckets provided and Assets will not be supported.
     */
    readonly assetBuckets?: IBucket[];
    /**
     * The common prefix for the asset bucket names used by this StackSetStack.
     *
     * Required if `assetBuckets` is provided.
     *
     * @default - No Buckets provided and Assets will not be supported.
     */
    readonly assetBucketPrefix?: string;
    private bucketDeployments;
    /**
     * Creates a new StackSetStackSynthesizer.
     *
     * @param assetBuckets An array of S3 buckets to use for storing assets.
     * @param assetBucketPrefix The prefix to use for the asset bucket names.
     */
    constructor(assetBuckets?: IBucket[], assetBucketPrefix?: string);
    addFileAsset(asset: FileAssetSource): FileAssetLocation;
    addDockerImageAsset(_asset: DockerImageAssetSource): DockerImageAssetLocation;
    synthesize(session: ISynthesisSession): void;
}
/**
 * StackSet stack props.
 */
export interface StackSetStackProps {
    /**
     * An array of Buckets can be passed to store assets, enabling StackSetStack Asset support
     *
     * One Bucket is required per target region. The name must be `${assetBucketPrefix}-<region>`, where
     * `<region>` is the region targeted by the StackSet.
     *
     * @default - No Buckets provided and Assets will not be supported.
     */
    readonly assetBuckets?: IBucket[];
    /**
     * The common prefix for the asset bucket names used by this StackSetStack.
     *
     * Required if `assetBuckets` is provided.
     *
     * @default - No Buckets provided and Assets will not be supported.
     */
    readonly assetBucketPrefix?: string;
}
/**
 * A StackSet stack, which is similar to a normal CloudFormation stack with
 * some differences.
 *
 * This stack will not be treated as an independent deployment
 * artifact (won't be listed in "cdk list" or deployable through "cdk deploy"),
 * but rather only synthesized as a template and uploaded as an asset to S3.
 */
export declare class StackSetStack extends Stack {
    readonly templateFile: string;
    private _templateUrl?;
    private _parentStack;
    /**
     * Creates a new StackSetStack.
     * @param scope The scope in which to define this StackSet.
     * @param id The ID of the StackSet.
     * @param props The properties of the StackSet.
     */
    constructor(scope: Construct, id: string, props?: StackSetStackProps);
}
