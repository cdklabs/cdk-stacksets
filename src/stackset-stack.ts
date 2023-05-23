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
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Deployment environment for an AWS StackSet stack.
 *
 * Interoperates with the StackSynthesizer of the parent stack.
 */
export class StackSetStackSynthesizer extends StackSynthesizer {
  public addFileAsset(_asset: FileAssetSource): FileAssetLocation {
    throw new Error('StackSets cannot use Assets');
  }

  public addDockerImageAsset(_asset: DockerImageAssetSource): DockerImageAssetLocation {
    throw new Error('StackSets cannot use Assets');
  }

  public synthesize(session: ISynthesisSession): void {
    // Synthesize the template, but don't emit as a cloud assembly artifact.
    // It will be registered as an S3 asset of its parent instead.
    this.synthesizeTemplate(session);
  }
}

/**
 * Properties for a StackSet Deployment. Subset of normal Stack properties.
 */
interface StackSetStackProps {
  /**
   * Include runtime versioning information in this Stack
   *
   * @default `analyticsReporting` setting of containing `App`, or value of
   * 'aws:cdk:version-reporting' context key
   */
  readonly analyticsReporting?: boolean;

  /**
   * A description of the stack.
   *
   * @default - No description.
   */
  readonly description?: string;

  /**
   * Stack tags that will be applied to all the taggable resources and the stack itself.
   *
   * @default {}
   */
  readonly tags?: { [key: string]: string };
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
  constructor(scope: Construct, id: string, props: StackSetStackProps) {
    super(scope, id, {
      synthesizer: new StackSetStackSynthesizer(),
      ...props,
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
