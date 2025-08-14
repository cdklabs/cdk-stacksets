import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  Stack,
  StackSynthesizer,
  FileAssetSource,
  FileAssetLocation,
  DockerImageAssetLocation,
  DockerImageAssetSource,
  ISynthesisSession,
  Names,
  Lazy,
  FileAssetPackaging,
  App,
  Resource,
  Annotations,
  Fn,
} from 'aws-cdk-lib';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export const fileAssetResourceNames: string[] = [];

interface AssetBucketDeploymentProperties {
  assetBucket: IBucket;
  bucketDeployment?: BucketDeployment;
}

/**
 * Deployment environment for an AWS StackSet stack.
 *
 * Interoperates with the StackSynthesizer of the parent stack.
 */
export class StackSetStackSynthesizer extends StackSynthesizer {
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
  private bucketDeployments: { [key: string]: AssetBucketDeploymentProperties };

  /**
   * Creates a new StackSetStackSynthesizer.
   *
   * @param assetBuckets An array of S3 buckets to use for storing assets.
   * @param assetBucketPrefix The prefix to use for the asset bucket names.
   */
  constructor(assetBuckets?: IBucket[], assetBucketPrefix?: string) {
    super();
    this.assetBuckets = assetBuckets;
    this.assetBucketPrefix = assetBucketPrefix;
    this.bucketDeployments = {};
    for (const assetBucket of assetBuckets ?? []) {
      this.bucketDeployments[assetBucket.bucketName] = { assetBucket };
    }
  }

  public addFileAsset(asset: FileAssetSource): FileAssetLocation {
    if (!this.assetBuckets) {
      throw new Error('An Asset Bucket must be provided to use File Assets');
    }

    if (!this.assetBucketPrefix) {
      throw new Error('An Asset Bucket Prefix must be provided to use File Assets');
    }

    if (!asset.fileName) {
      throw new Error('Asset filename is undefined');
    }

    const outdir = App.of(this.boundStack)?.outdir ?? 'cdk.out';
    const assetPath = `${outdir}/${asset.fileName}`;

    for (const assetBucket of this.assetBuckets) {
      const index = this.assetBuckets.indexOf(assetBucket);
      const assetDeployment = this.bucketDeployments[assetBucket.bucketName];

      if (!assetDeployment.bucketDeployment) {
        const parentStack = (this.boundStack as StackSetStack)._getParentStack();

        if (!Resource.isOwnedResource(assetDeployment.assetBucket)) {
          Annotations.of(parentStack).addWarning('[WARNING] Bucket Policy Permissions cannot be added to' +
              ' referenced Bucket. Please make sure your bucket has the correct permissions');
        }

        const bucketDeploymentConstructName = `${Names.uniqueId(this.boundStack)}-AssetBucketDeployment-${index}`;

        fileAssetResourceNames.push(bucketDeploymentConstructName);

        const bucketDeployment = new BucketDeployment(
          parentStack,
          bucketDeploymentConstructName,
          {
            sources: [Source.asset(assetPath)],
            destinationBucket: assetDeployment.assetBucket,
            extract: false,
            prune: false,
          },
        );

        assetDeployment.bucketDeployment = bucketDeployment;
      } else {
        assetDeployment.bucketDeployment.addSource(Source.asset(assetPath));
      }
    }

    const bucketName = Fn.join('-', [this.assetBucketPrefix, this.boundStack.region]);

    const assetFileBaseName = path.basename(asset.fileName);
    const s3Filename = assetFileBaseName.split('.')[1] + '.zip';
    const objectKey = `${s3Filename}`;
    const s3ObjectUrl = `s3://${bucketName}/${objectKey}`;
    const httpUrl = `https://s3.${bucketName}/${objectKey}`;

    return { bucketName, objectKey, httpUrl, s3ObjectUrl };
  }

  public addDockerImageAsset(_asset: DockerImageAssetSource): DockerImageAssetLocation {
    throw new Error('StackSets cannot use Docker Image Assets');
  }

  public synthesize(session: ISynthesisSession): void {
    // Synthesize the template, but don't emit as a cloud assembly artifact.
    // It will be registered as an S3 asset of its parent instead.
    this.synthesizeTemplate(session);
  }
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
export class StackSetStack extends Stack {
  public readonly templateFile: string;
  private _templateUrl?: string;
  private _parentStack: Stack;

  /**
   * Creates a new StackSetStack.
   * @param scope The scope in which to define this StackSet.
   * @param id The ID of the StackSet.
   * @param props The properties of the StackSet.
   */
  constructor(scope: Construct, id: string, props: StackSetStackProps = {}) {
    super(scope, id, {
      synthesizer: new StackSetStackSynthesizer(props.assetBuckets, props.assetBucketPrefix),
    });

    this._parentStack = findParentStack(scope);

    // this is the file name of the synthesized template file within the cloud assembly
    this.templateFile = `${Names.uniqueId(this)}.stackset.template.json`;
  }

  /**
   * Fetch the template URL.
   *
   * @internal
   */
  public _getTemplateUrl(): string {
    return Lazy.uncachedString({ produce: () => this._templateUrl });
  }

  /**
   * Fetch the Parent Stack.
   *
   * @internal
   */
  public _getParentStack(): Stack {
    return this._parentStack;
  }

  /**
   * Synthesize the product stack template, overrides the `super` class method.
   *
   * Defines an asset at the parent stack which represents the template of this
   * product stack.
   *
   * @internal
   */
  public _synthesizeTemplate(session: ISynthesisSession): void {
    const cfn = JSON.stringify(this._toCloudFormation(), undefined, 2);
    const templateHash = crypto.createHash('sha256').update(cfn).digest('hex');

    this._templateUrl = this._parentStack.synthesizer.addFileAsset({
      packaging: FileAssetPackaging.FILE,
      sourceHash: templateHash,
      fileName: this.templateFile,
    }).httpUrl;

    fs.writeFileSync(path.join(session.assembly.outdir, this.templateFile), cfn);
  }
}

/**
 * Validates the scope for a stackset stack, which must be defined within the scope of another `Stack`.
 */
function findParentStack(scope: Construct): Stack {
  try {
    const parentStack = Stack.of(scope);
    return parentStack as Stack;
  } catch (e) {
    throw new Error('StackSet stacks must be defined within scope of another non-stackset stack');
  }
}
