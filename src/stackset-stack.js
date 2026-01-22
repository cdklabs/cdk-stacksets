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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackSetStack = exports.StackSetStackSynthesizer = exports.fileAssetResourceNames = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_s3_deployment_1 = require("aws-cdk-lib/aws-s3-deployment");
exports.fileAssetResourceNames = [];
/**
 * Deployment environment for an AWS StackSet stack.
 *
 * Interoperates with the StackSynthesizer of the parent stack.
 */
class StackSetStackSynthesizer extends aws_cdk_lib_1.StackSynthesizer {
    /**
     * Creates a new StackSetStackSynthesizer.
     *
     * @param assetBuckets An array of S3 buckets to use for storing assets.
     * @param assetBucketPrefix The prefix to use for the asset bucket names.
     */
    constructor(assetBuckets, assetBucketPrefix) {
        super();
        this.assetBuckets = assetBuckets;
        this.assetBucketPrefix = assetBucketPrefix;
        this.bucketDeployments = {};
        for (const assetBucket of assetBuckets ?? []) {
            this.bucketDeployments[assetBucket.bucketName] = { assetBucket };
        }
    }
    addFileAsset(asset) {
        if (!this.assetBuckets) {
            throw new Error('An Asset Bucket must be provided to use File Assets');
        }
        if (!this.assetBucketPrefix) {
            throw new Error('An Asset Bucket Prefix must be provided to use File Assets');
        }
        if (!asset.fileName) {
            throw new Error('Asset filename is undefined');
        }
        const outdir = aws_cdk_lib_1.App.of(this.boundStack)?.outdir ?? 'cdk.out';
        const assetPath = `${outdir}/${asset.fileName}`;
        for (const assetBucket of this.assetBuckets) {
            const index = this.assetBuckets.indexOf(assetBucket);
            const assetDeployment = this.bucketDeployments[assetBucket.bucketName];
            if (!assetDeployment.bucketDeployment) {
                const parentStack = this.boundStack._getParentStack();
                if (!aws_cdk_lib_1.Resource.isOwnedResource(assetDeployment.assetBucket)) {
                    aws_cdk_lib_1.Annotations.of(parentStack).addWarning('[WARNING] Bucket Policy Permissions cannot be added to' +
                        ' referenced Bucket. Please make sure your bucket has the correct permissions');
                }
                const bucketDeploymentConstructName = `${aws_cdk_lib_1.Names.uniqueId(this.boundStack)}-AssetBucketDeployment-${index}`;
                exports.fileAssetResourceNames.push(bucketDeploymentConstructName);
                const bucketDeployment = new aws_s3_deployment_1.BucketDeployment(parentStack, bucketDeploymentConstructName, {
                    sources: [aws_s3_deployment_1.Source.asset(assetPath)],
                    destinationBucket: assetDeployment.assetBucket,
                    extract: false,
                    prune: false,
                });
                assetDeployment.bucketDeployment = bucketDeployment;
            }
            else {
                assetDeployment.bucketDeployment.addSource(aws_s3_deployment_1.Source.asset(assetPath));
            }
        }
        const bucketName = aws_cdk_lib_1.Fn.join('-', [this.assetBucketPrefix, this.boundStack.region]);
        const assetFileBaseName = path.basename(asset.fileName);
        const s3Filename = assetFileBaseName.split('.')[1] + '.zip';
        const objectKey = `${s3Filename}`;
        const s3ObjectUrl = `s3://${bucketName}/${objectKey}`;
        const httpUrl = `https://s3.${bucketName}/${objectKey}`;
        return { bucketName, objectKey, httpUrl, s3ObjectUrl };
    }
    addDockerImageAsset(_asset) {
        throw new Error('StackSets cannot use Docker Image Assets');
    }
    synthesize(session) {
        // Synthesize the template, but don't emit as a cloud assembly artifact.
        // It will be registered as an S3 asset of its parent instead.
        this.synthesizeTemplate(session);
    }
}
exports.StackSetStackSynthesizer = StackSetStackSynthesizer;
/**
 * A StackSet stack, which is similar to a normal CloudFormation stack with
 * some differences.
 *
 * This stack will not be treated as an independent deployment
 * artifact (won't be listed in "cdk list" or deployable through "cdk deploy"),
 * but rather only synthesized as a template and uploaded as an asset to S3.
 */
class StackSetStack extends aws_cdk_lib_1.Stack {
    /**
     * Creates a new StackSetStack.
     * @param scope The scope in which to define this StackSet.
     * @param id The ID of the StackSet.
     * @param props The properties of the StackSet.
     */
    constructor(scope, id, props = {}) {
        super(scope, id, {
            synthesizer: new StackSetStackSynthesizer(props.assetBuckets, props.assetBucketPrefix),
        });
        this._parentStack = findParentStack(scope);
        // this is the file name of the synthesized template file within the cloud assembly
        this.templateFile = `${aws_cdk_lib_1.Names.uniqueId(this)}.stackset.template.json`;
    }
    /**
     * Fetch the template URL.
     *
     * @internal
     */
    _getTemplateUrl() {
        return aws_cdk_lib_1.Lazy.uncachedString({ produce: () => this._templateUrl });
    }
    /**
     * Fetch the Parent Stack.
     *
     * @internal
     */
    _getParentStack() {
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
    _synthesizeTemplate(session) {
        const cfn = JSON.stringify(this._toCloudFormation(), undefined, 2);
        const templateHash = crypto.createHash('sha256').update(cfn).digest('hex');
        this._templateUrl = this._parentStack.synthesizer.addFileAsset({
            packaging: aws_cdk_lib_1.FileAssetPackaging.FILE,
            sourceHash: templateHash,
            fileName: this.templateFile,
        }).httpUrl;
        fs.writeFileSync(path.join(session.assembly.outdir, this.templateFile), cfn);
    }
}
exports.StackSetStack = StackSetStack;
/**
 * Validates the scope for a stackset stack, which must be defined within the scope of another `Stack`.
 */
function findParentStack(scope) {
    try {
        const parentStack = aws_cdk_lib_1.Stack.of(scope);
        return parentStack;
    }
    catch (e) {
        throw new Error('StackSet stacks must be defined within scope of another non-stackset stack');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2tzZXQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGFja3NldC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUFpQztBQUNqQyx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLDZDQWVxQjtBQUVyQixxRUFBeUU7QUFHNUQsUUFBQSxzQkFBc0IsR0FBYSxFQUFFLENBQUM7QUFPbkQ7Ozs7R0FJRztBQUNILE1BQWEsd0JBQXlCLFNBQVEsOEJBQWdCO0lBb0I1RDs7Ozs7T0FLRztJQUNILFlBQVksWUFBd0IsRUFBRSxpQkFBMEI7UUFDOUQsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFDM0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztRQUM1QixLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksSUFBSSxFQUFFLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxDQUFDO1NBQ2xFO0lBQ0gsQ0FBQztJQUVNLFlBQVksQ0FBQyxLQUFzQjtRQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7U0FDeEU7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQztTQUMvRTtRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFO1lBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztTQUNoRDtRQUVELE1BQU0sTUFBTSxHQUFHLGlCQUFHLENBQUMsRUFB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WCxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQy9FLENBQUM7Q0FDRjtBQTVERCxzQ0E0REM7QUFFRDs7R0FFRztBQUNILFNBQVMsZUFBZSxDQUFDLEtBQWdCO0lBQ3ZDLElBQUk7UUFDRixNQUFNLFdBQVcsR0FBRyxtQkFBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQyxPQUFPLFdBQW9CLENBQUM7S0FDN0I7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsNEVBQTRFLENBQUMsQ0FBQztLQUMvRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1xuICBTdGFjayxcbiAgU3RhY2tTeW50aGVzaXplcixcbiAgRmlsZUFzc2V0U291cmNlLFxuICBGaWxlQXNzZXRMb2NhdGlvbixcbiAgRG9ja2VySW1hZ2VBc3NldExvY2F0aW9uLFxuICBEb2NrZXJJbWFnZUFzc2V0U291cmNlLFxuICBJU3ludGhlc2lzU2Vzc2lvbixcbiAgTmFtZXMsXG4gIExhenksXG4gIEZpbGVBc3NldFBhY2thZ2luZyxcbiAgQXBwLFxuICBSZXNvdXJjZSxcbiAgQW5ub3RhdGlvbnMsXG4gIEZuLFxufSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBJQnVja2V0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IEJ1Y2tldERlcGxveW1lbnQsIFNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgY29uc3QgZmlsZUFzc2V0UmVzb3VyY2VOYW1lczogc3RyaW5nW10gPSBbXTtcblxuaW50ZXJmYWNlIEFzc2V0QnVja2V0RGVwbG95bWVudFByb3BlcnRpZXMge1xuICBhc3NldEJ1Y2tldDogSUJ1Y2tldDtcbiAgYnVja2V0RGVwbG95bWVudD86IEJ1Y2tldERlcGxveW1lbnQ7XG59XG5cbi8qKlxuICogRGVwbG95bWVudCBlbnZpcm9ubWVudCBmb3IgYW4gQVdTIFN0YWNrU2V0IHN0YWNrLlxuICpcbiAqIEludGVyb3BlcmF0ZXMgd2l0aCB0aGUgU3RhY2tTeW50aGVzaXplciBvZiB0aGUgcGFyZW50IHN0YWNrLlxuICovXG5leHBvcnQgY2xhc3MgU3RhY2tTZXRTdGFja1N5bnRoZXNpemVyIGV4dGVuZHMgU3RhY2tTeW50aGVzaXplciB7XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBCdWNrZXRzIGNhbiBiZSBwYXNzZWQgdG8gc3RvcmUgYXNzZXRzLCBlbmFibGluZyBTdGFja1NldFN0YWNrIEFzc2V0IHN1cHBvcnRcbiAgICpcbiAgICogT25lIEJ1Y2tldCBpcyByZXF1aXJlZCBwZXIgdGFyZ2V0IHJlZ2lvbi4gVGhlIG5hbWUgbXVzdCBiZSBgJHthc3NldEJ1Y2tldFByZWZpeH0tPHJlZ2lvbj5gLCB3aGVyZVxuICAgKiBgPHJlZ2lvbj5gIGlzIHRoZSByZWdpb24gdGFyZ2V0ZWQgYnkgdGhlIFN0YWNrU2V0LlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIE5vIEJ1Y2tldHMgcHJvdmlkZWQgYW5kIEFzc2V0cyB3aWxsIG5vdCBiZSBzdXBwb3J0ZWQuXG4gICAqL1xuICByZWFkb25seSBhc3NldEJ1Y2tldHM/OiBJQnVja2V0W107XG4gIC8qKlxuICAgKiBUaGUgY29tbW9uIHByZWZpeCBmb3IgdGhlIGFzc2V0IGJ1Y2tldCBuYW1lcyB1c2VkIGJ5IHRoaXMgU3RhY2tTZXRTdGFjay5cbiAgICpcbiAgICogUmVxdWlyZWQgaWYgYGFzc2V0QnVja2V0c2AgaXMgcHJvdmlkZWQuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm8gQnVja2V0cyBwcm92aWRlZCBhbmQgQXNzZXRzIHdpbGwgbm90IGJlIHN1cHBvcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IGFzc2V0QnVja2V0UHJlZml4Pzogc3RyaW5nO1xuICBwcml2YXRlIGJ1Y2tldERlcGxveW1lbnRzOiB7IFtrZXk6IHN0cmluZ106IEFzc2V0QnVja2V0RGVwbG95bWVudFByb3BlcnRpZXMgfTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBTdGFja1NldFN0YWNrU3ludGhlc2l6ZXIuXG4gICAqXG4gICAqIEBwYXJhbSBhc3NldEJ1Y2tldHMgQW4gYXJyYXkgb2YgUzMgYnVja2V0cyB0byB1c2UgZm9yIHN0b3JpbmcgYXNzZXRzLlxuICAgKiBAcGFyYW0gYXNzZXRCdWNrZXRQcmVmaXggVGhlIHByZWZpeCB0byB1c2UgZm9yIHRoZSBhc3NldCBidWNrZXQgbmFtZXMuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihhc3NldEJ1Y2tldHM/OiBJQnVja2V0W10sIGFzc2V0QnVja2V0UHJlZml4Pzogc3RyaW5nKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmFzc2V0QnVja2V0cyA9IGFzc2V0QnVja2V0cztcbiAgICB0aGlzLmFzc2V0QnVja2V0UHJlZml4ID0gYXNzZXRCdWNrZXRQcmVmaXg7XG4gICAgdGhpcy5idWNrZXREZXBsb3ltZW50cyA9IHt9O1xuICAgIGZvciAoY29uc3QgYXNzZXRCdWNrZXQgb2YgYXNzZXRCdWNrZXRzID8/IFtdKSB7XG4gICAgICB0aGlzLmJ1Y2tldERlcGxveW1lbnRzW2Fzc2V0QnVja2V0LmJ1Y2tldE5hbWVdID0geyBhc3NldEJ1Y2tldCB9O1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhZGRGaWxlQXNzZXQoYXNzZXQ6IEZpbGVBc3NldFNvdXJjZSk6IEZpbGVBc3NldExvY2F0aW9uIHtcbiAgICBpZiAoIXRoaXMuYXNzZXRCdWNrZXRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuIEFzc2V0IEJ1Y2tldCBtdXN0IGJlIHByb3ZpZGVkIHRvIHVzZSBGaWxlIEFzc2V0cycpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5hc3NldEJ1Y2tldFByZWZpeCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBbiBBc3NldCBCdWNrZXQgUHJlZml4IG11c3QgYmUgcHJvdmlkZWQgdG8gdXNlIEZpbGUgQXNzZXRzJyk7XG4gICAgfVxuXG4gICAgaWYgKCFhc3NldC5maWxlTmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NldCBmaWxlbmFtZSBpcyB1bmRlZmluZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRkaXIgPSBBcHAub2YodGhpcy5ib3VuZFN0YWNrKT8ub3V0ZGlyID8/ICdjZGsub3V0JztcbiAgICBjb25zdCBhc3NldFBhdGggPSBgJHtvdXRkaXJ9LyR7YXNzZXQuZmlsZU5hbWV9YDtcblxuICAgIGZvciAoY29uc3QgYXNzZXRCdWNrZXQgb2YgdGhpcy5hc3NldEJ1Y2tldHMpIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5hc3NldEJ1Y2tldHMuaW5kZXhPZihhc3NldEJ1Y2tldCk7XG4gICAgICBjb25zdCBhc3NldERlcGxveW1lbnQgPSB0aGlzLmJ1Y2tldERlcGxveW1lbnRzW2Fzc2V0QnVja2V0LmJ1Y2tldE5hbWVdO1xuXG4gICAgICBpZiAoIWFzc2V0RGVwbG95bWVudC5idWNrZXREZXBsb3ltZW50KSB7XG4gICAgICAgIGNvbnN0IHBhcmVudFN0YWNrID0gKHRoaXMuYm91bmRTdGFjayBhcyBTdGFja1NldFN0YWNrKS5fZ2V0UGFyZW50U3RhY2soKTtcblxuICAgICAgICBpZiAoIVJlc291cmNlLmlzT3duZWRSZXNvdXJjZShhc3NldERlcGxveW1lbnQuYXNzZXRCdWNrZXQpKSB7XG4gICAgICAgICAgQW5ub3RhdGlvbnMub2YocGFyZW50U3RhY2spLmFkZFdhcm5pbmcoJ1tXQVJOSU5HXSBCdWNrZXQgUG9saWN5IFBlcm1pc3Npb25zIGNhbm5vdCBiZSBhZGRlZCB0bycgK1xuICAgICAgICAgICAgICAnIHJlZmVyZW5jZWQgQnVja2V0LiBQbGVhc2UgbWFrZSBzdXJlIHlvdXIgYnVja2V0IGhhcyB0aGUgY29ycmVjdCBwZXJtaXNzaW9ucycpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYnVja2V0RGVwbG95bWVudENvbnN0cnVjdE5hbWUgPSBgJHtOYW1lcy51bmlxdWVJZCh0aGlzLmJvdW5kU3RhY2spfS1Bc3NldEJ1Y2tldERlcGxveW1lbnQtJHtpbmRleH1gO1xuXG4gICAgICAgIGZpbGVBc3NldFJlc291cmNlTmFtZXMucHVzaChidWNrZXREZXBsb3ltZW50Q29uc3RydWN0TmFtZSk7XG5cbiAgICAgICAgY29uc3QgYnVja2V0RGVwbG95bWVudCA9IG5ldyBCdWNrZXREZXBsb3ltZW50KFxuICAgICAgICAgIHBhcmVudFN0YWNrLFxuICAgICAgICAgIGJ1Y2tldERlcGxveW1lbnRDb25zdHJ1Y3ROYW1lLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNvdXJjZXM6IFtTb3VyY2UuYXNzZXQoYXNzZXRQYXRoKV0sXG4gICAgICAgICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogYXNzZXREZXBsb3ltZW50LmFzc2V0QnVja2V0LFxuICAgICAgICAgICAgZXh0cmFjdDogZmFsc2UsXG4gICAgICAgICAgICBwcnVuZTogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcblxuICAgICAgICBhc3NldERlcGxveW1lbnQuYnVja2V0RGVwbG95bWVudCA9IGJ1Y2tldERlcGxveW1lbnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NldERlcGxveW1lbnQuYnVja2V0RGVwbG95bWVudC5hZGRTb3VyY2UoU291cmNlLmFzc2V0KGFzc2V0UGF0aCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGJ1Y2tldE5hbWUgPSBGbi5qb2luKCctJywgW3RoaXMuYXNzZXRCdWNrZXRQcmVmaXgsIHRoaXMuYm91bmRTdGFjay5yZWdpb25dKTtcblxuICAgIGNvbnN0IGFzc2V0RmlsZUJhc2VOYW1lID0gcGF0aC5iYXNlbmFtZShhc3NldC5maWxlTmFtZSk7XG4gICAgY29uc3QgczNGaWxlbmFtZSA9IGFzc2V0RmlsZUJhc2VOYW1lLnNwbGl0KCcuJylbMV0gKyAnLnppcCc7XG4gICAgY29uc3Qgb2JqZWN0S2V5ID0gYCR7czNGaWxlbmFtZX1gO1xuICAgIGNvbnN0IHMzT2JqZWN0VXJsID0gYHMzOi8vJHtidWNrZXROYW1lfS8ke29iamVjdEtleX1gO1xuICAgIGNvbnN0IGh0dHBVcmwgPSBgaHR0cHM6Ly9zMy4ke2J1Y2tldE5hbWV9LyR7b2JqZWN0S2V5fWA7XG5cbiAgICByZXR1cm4geyBidWNrZXROYW1lLCBvYmplY3RLZXksIGh0dHBVcmwsIHMzT2JqZWN0VXJsIH07XG4gIH1cblxuICBwdWJsaWMgYWRkRG9ja2VySW1hZ2VBc3NldChfYXNzZXQ6IERvY2tlckltYWdlQXNzZXRTb3VyY2UpOiBEb2NrZXJJbWFnZUFzc2V0TG9jYXRpb24ge1xuICAgIHRocm93IG5ldyBFcnJvcignU3RhY2tTZXRzIGNhbm5vdCB1c2UgRG9ja2VyIEltYWdlIEFzc2V0cycpO1xuICB9XG5cbiAgcHVibGljIHN5bnRoZXNpemUoc2Vzc2lvbjogSVN5bnRoZXNpc1Nlc3Npb24pOiB2b2lkIHtcbiAgICAvLyBTeW50aGVzaXplIHRoZSB0ZW1wbGF0ZSwgYnV0IGRvbid0IGVtaXQgYXMgYSBjbG91ZCBhc3NlbWJseSBhcnRpZmFjdC5cbiAgICAvLyBJdCB3aWxsIGJlIHJlZ2lzdGVyZWQgYXMgYW4gUzMgYXNzZXQgb2YgaXRzIHBhcmVudCBpbnN0ZWFkLlxuICAgIHRoaXMuc3ludGhlc2l6ZVRlbXBsYXRlKHNlc3Npb24pO1xuICB9XG59XG5cbi8qKlxuICogU3RhY2tTZXQgc3RhY2sgcHJvcHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3RhY2tTZXRTdGFja1Byb3BzIHtcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIEJ1Y2tldHMgY2FuIGJlIHBhc3NlZCB0byBzdG9yZSBhc3NldHMsIGVuYWJsaW5nIFN0YWNrU2V0U3RhY2sgQXNzZXQgc3VwcG9ydFxuICAgKlxuICAgKiBPbmUgQnVja2V0IGlzIHJlcXVpcmVkIHBlciB0YXJnZXQgcmVnaW9uLiBUaGUgbmFtZSBtdXN0IGJlIGAke2Fzc2V0QnVja2V0UHJlZml4fS08cmVnaW9uPmAsIHdoZXJlXG4gICAqIGA8cmVnaW9uPmAgaXMgdGhlIHJlZ2lvbiB0YXJnZXRlZCBieSB0aGUgU3RhY2tTZXQuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm8gQnVja2V0cyBwcm92aWRlZCBhbmQgQXNzZXRzIHdpbGwgbm90IGJlIHN1cHBvcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IGFzc2V0QnVja2V0cz86IElCdWNrZXRbXTtcbiAgLyoqXG4gICAqIFRoZSBjb21tb24gcHJlZml4IGZvciB0aGUgYXNzZXQgYnVja2V0IG5hbWVzIHVzZWQgYnkgdGhpcyBTdGFja1NldFN0YWNrLlxuICAgKlxuICAgKiBSZXF1aXJlZCBpZiBgYXNzZXRCdWNrZXRzYCBpcyBwcm92aWRlZC5cbiAgICpcbiAgICogQGRlZmF1bHQgLSBObyBCdWNrZXRzIHByb3ZpZGVkIGFuZCBBc3NldHMgd2lsbCBub3QgYmUgc3VwcG9ydGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgYXNzZXRCdWNrZXRQcmVmaXg/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBTdGFja1NldCBzdGFjaywgd2hpY2ggaXMgc2ltaWxhciB0byBhIG5vcm1hbCBDbG91ZEZvcm1hdGlvbiBzdGFjayB3aXRoXG4gKiBzb21lIGRpZmZlcmVuY2VzLlxuICpcbiAqIFRoaXMgc3RhY2sgd2lsbCBub3QgYmUgdHJlYXRlZCBhcyBhbiBpbmRlcGVuZGVudCBkZXBsb3ltZW50XG4gKiBhcnRpZmFjdCAod29uJ3QgYmUgbGlzdGVkIGluIFwiY2RrIGxpc3RcIiBvciBkZXBsb3lhYmxlIHRocm91Z2ggXCJjZGsgZGVwbG95XCIpLFxuICogYnV0IHJhdGhlciBvbmx5IHN5bnRoZXNpemVkIGFzIGEgdGVtcGxhdGUgYW5kIHVwbG9hZGVkIGFzIGFuIGFzc2V0IHRvIFMzLlxuICovXG5leHBvcnQgY2xhc3MgU3RhY2tTZXRTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHRlbXBsYXRlRmlsZTogc3RyaW5nO1xuICBwcml2YXRlIF90ZW1wbGF0ZVVybD86IHN0cmluZztcbiAgcHJpdmF0ZSBfcGFyZW50U3RhY2s6IFN0YWNrO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IFN0YWNrU2V0U3RhY2suXG4gICAqIEBwYXJhbSBzY29wZSBUaGUgc2NvcGUgaW4gd2hpY2ggdG8gZGVmaW5lIHRoaXMgU3RhY2tTZXQuXG4gICAqIEBwYXJhbSBpZCBUaGUgSUQgb2YgdGhlIFN0YWNrU2V0LlxuICAgKiBAcGFyYW0gcHJvcHMgVGhlIHByb3BlcnRpZXMgb2YgdGhlIFN0YWNrU2V0LlxuICAgKi9cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFN0YWNrU2V0U3RhY2tQcm9wcyA9IHt9KSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCB7XG4gICAgICBzeW50aGVzaXplcjogbmV3IFN0YWNrU2V0U3RhY2tTeW50aGVzaXplcihwcm9wcy5hc3NldEJ1Y2tldHMsIHByb3BzLmFzc2V0QnVja2V0UHJlZml4KSxcbiAgICB9KTtcblxuICAgIHRoaXMuX3BhcmVudFN0YWNrID0gZmluZFBhcmVudFN0YWNrKHNjb3BlKTtcblxuICAgIC8vIHRoaXMgaXMgdGhlIGZpbGUgbmFtZSBvZiB0aGUgc3ludGhlc2l6ZWQgdGVtcGxhdGUgZmlsZSB3aXRoaW4gdGhlIGNsb3VkIGFzc2VtYmx5XG4gICAgdGhpcy50ZW1wbGF0ZUZpbGUgPSBgJHtOYW1lcy51bmlxdWVJZCh0aGlzKX0uc3RhY2tzZXQudGVtcGxhdGUuanNvbmA7XG4gIH1cblxuICAvKipcbiAgICogRmV0Y2ggdGhlIHRlbXBsYXRlIFVSTC5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBwdWJsaWMgX2dldFRlbXBsYXRlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIExhenkudW5jYWNoZWRTdHJpbmcoeyBwcm9kdWNlOiAoKSA9PiB0aGlzLl90ZW1wbGF0ZVVybCB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCB0aGUgUGFyZW50IFN0YWNrLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHB1YmxpYyBfZ2V0UGFyZW50U3RhY2soKTogU3RhY2sge1xuICAgIHJldHVybiB0aGlzLl9wYXJlbnRTdGFjaztcbiAgfVxuXG4gIC8qKlxuICAgKiBTeW50aGVzaXplIHRoZSBwcm9kdWN0IHN0YWNrIHRlbXBsYXRlLCBvdmVycmlkZXMgdGhlIGBzdXBlcmAgY2xhc3MgbWV0aG9kLlxuICAgKlxuICAgKiBEZWZpbmVzIGFuIGFzc2V0IGF0IHRoZSBwYXJlbnQgc3RhY2sgd2hpY2ggcmVwcmVzZW50cyB0aGUgdGVtcGxhdGUgb2YgdGhpc1xuICAgKiBwcm9kdWN0IHN0YWNrLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHB1YmxpYyBfc3ludGhlc2l6ZVRlbXBsYXRlKHNlc3Npb246IElTeW50aGVzaXNTZXNzaW9uKTogdm9pZCB7XG4gICAgY29uc3QgY2ZuID0gSlNPTi5zdHJpbmdpZnkodGhpcy5fdG9DbG91ZEZvcm1hdGlvbigpLCB1bmRlZmluZWQsIDIpO1xuICAgIGNvbnN0IHRlbXBsYXRlSGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUoY2ZuKS5kaWdlc3QoJ2hleCcpO1xuXG4gICAgdGhpcy5fdGVtcGxhdGVVcmwgPSB0aGlzLl9wYXJlbnRTdGFjay5zeW50aGVzaXplci5hZGRGaWxlQXNzZXQoe1xuICAgICAgcGFja2FnaW5nOiBGaWxlQXNzZXRQYWNrYWdpbmcuRklMRSxcbiAgICAgIHNvdXJjZUhhc2g6IHRlbXBsYXRlSGFzaCxcbiAgICAgIGZpbGVOYW1lOiB0aGlzLnRlbXBsYXRlRmlsZSxcbiAgICB9KS5odHRwVXJsO1xuXG4gICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4oc2Vzc2lvbi5hc3NlbWJseS5vdXRkaXIsIHRoaXMudGVtcGxhdGVGaWxlKSwgY2ZuKTtcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGUgc2NvcGUgZm9yIGEgc3RhY2tzZXQgc3RhY2ssIHdoaWNoIG11c3QgYmUgZGVmaW5lZCB3aXRoaW4gdGhlIHNjb3BlIG9mIGFub3RoZXIgYFN0YWNrYC5cbiAqL1xuZnVuY3Rpb24gZmluZFBhcmVudFN0YWNrKHNjb3BlOiBDb25zdHJ1Y3QpOiBTdGFjayB7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFyZW50U3RhY2sgPSBTdGFjay5vZihzY29wZSk7XG4gICAgcmV0dXJuIHBhcmVudFN0YWNrIGFzIFN0YWNrO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTdGFja1NldCBzdGFja3MgbXVzdCBiZSBkZWZpbmVkIHdpdGhpbiBzY29wZSBvZiBhbm90aGVyIG5vbi1zdGFja3NldCBzdGFjaycpO1xuICB9XG59XG4iXX0=