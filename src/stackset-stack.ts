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
} from 'aws-cdk-lib';
import { CfnBucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export const fileAssetResourceName = 'StackSetAssetsBucketDeployment';

/**
 * Deployment environment for an AWS StackSet stack.
 *
 * Interoperates with the StackSynthesizer of the parent stack.
 */
export class StackSetStackSynthesizer extends StackSynthesizer {
  private readonly assetBucket?: IBucket;
  private bucketDeployment?: BucketDeployment;

  constructor(assetBucket?: IBucket) {
    super();
    this.assetBucket = assetBucket;
  }

  public addFileAsset(asset: FileAssetSource): FileAssetLocation {
    if (!this.assetBucket) {
      throw new Error('An Asset Bucket must be provided to use File Assets');
    }

    if (!asset.fileName) {
      throw new Error('Asset filename is undefined');
    }

    const outdir = App.of(this.boundStack)?.outdir ?? 'cdk.out';
    const assetPath = `${outdir}/${asset.fileName}`;

    if (!this.bucketDeployment) {
      const parentStack = (this.boundStack as StackSetStack)._getParentStack();

      if (!Resource.isOwnedResource(this.assetBucket)) {
        Annotations.of(parentStack).addWarning('[WARNING] Bucket Policy Permissions cannot be added to' +
          ' referenced Bucket. Please make sure your bucket has the correct permissions');
      }

      const bucketDeployment = new BucketDeployment(
        parentStack,
        fileAssetResourceName,
        {
          sources: [Source.asset(assetPath)],
          destinationBucket: this.assetBucket,
          extract: false,
          prune: false,
        },
      );

      this.bucketDeployment = bucketDeployment;

    } else {
      this.bucketDeployment.addSource(Source.asset(assetPath));
    }

    const physicalName = this.physicalNameOfBucket(this.assetBucket);

    const bucketName = physicalName;
    const assetFileBaseName = path.basename(asset.fileName);
    const s3Filename = assetFileBaseName.split('.')[1] + '.zip';
    const objectKey = `${s3Filename}`;
    const s3ObjectUrl = `s3://${bucketName}/${objectKey}`;
    const httpUrl = `https://s3.${bucketName}/${objectKey}`;

    return { bucketName, objectKey, httpUrl, s3ObjectUrl };
  }

  private physicalNameOfBucket(bucket: IBucket) {
    let resolvedName;
    if (Resource.isOwnedResource(bucket)) {
      resolvedName = Stack.of(bucket).resolve((bucket.node.defaultChild as CfnBucket).bucketName);
    } else {
      resolvedName = bucket.bucketName;
    }
    if (resolvedName === undefined) {
      throw new Error('A bucketName must be provided to use Assets');
    }
    return resolvedName;
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
   * A Bucket can be passed to store assets, enabling StackSetStack Asset support
   * @default No Bucket provided and Assets will not be supported.
   */
  readonly assetBucket?: IBucket;

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
  constructor(scope: Construct, id: string, props: StackSetStackProps = {}) {
    super(scope, id, {
      synthesizer: new StackSetStackSynthesizer(props.assetBucket),
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
