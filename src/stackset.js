"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackSet = exports.RegionConcurrencyType = exports.Capability = exports.DeploymentType = exports.StackSetTarget = exports.StackSetTemplate = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const stackset_stack_1 = require("./stackset-stack");
/**
 * Represents a StackSet CloudFormation template
 */
class StackSetTemplate {
    /**
     * Creates a StackSetTemplate from a StackSetStack
     *
     * @param stack the stack to use as the base for the stackset template
     * @returns StackSetTemplate
     */
    static fromStackSetStack(stack) {
        return { templateUrl: stack._getTemplateUrl() };
    }
}
exports.StackSetTemplate = StackSetTemplate;
/**
 * The type of StackSet account filter
 */
var AccountFilterType;
(function (AccountFilterType) {
    /**
     * _Only_ deploys to specified accounts
     */
    AccountFilterType["INTERSECTION"] = "INTERSECTION";
    /**
     * _Does not_ deploy to the specified accounts
     */
    AccountFilterType["DIFFERENCE"] = "DIFFERENCE";
    /**
     * (default value) include both OUs and Accounts
     * Allows you to deploy to an OU _and_ specific accounts in a different OU
     */
    AccountFilterType["UNION"] = "UNION";
    /**
     * Only deploy to accounts in an OU
     */
    AccountFilterType["NONE"] = "NONE";
})(AccountFilterType || (AccountFilterType = {}));
/**
 * Which organizational units and/or accounts the stack set
 * should be deployed to.
 *
 * `fromAccounts` can be used to deploy the stack set to specific AWS accounts
 *
 * `fromOrganizationalUnits` can be used to deploy the stack set to specific organizational units
 * and optionally include additional accounts from other OUs, or exclude accounts from the specified
 * OUs
 *
 * @example
 * // deploy to specific accounts
 * StackSetTarget.fromAccounts({
 *   accounts: ['11111111111', '22222222222'],
 *   regions: ['us-east-1', 'us-east-2'],
 * });
 *
 * // deploy to OUs and 1 additional account
 * StackSetTarget.fromOrganizationalUnits({
 *   regions: ['us-east-1', 'us-east-2'],
 *   organizationalUnits: ['ou-1111111', 'ou-2222222'],
 *   additionalAccounts: ['33333333333'],
 * });
 *
 * // deploy to OUs but exclude 1 account
 * StackSetTarget.fromOrganizationalUnits({
 *   regions: ['us-east-1', 'us-east-2'],
 *   organizationalUnits: ['ou-1111111', 'ou-2222222'],
 *   excludeAccounts: ['11111111111'],
 * });
 */
class StackSetTarget {
    /**
     * Deploy the StackSet to a list of accounts
     *
     * @example
     * StackSetTarget.fromAccounts({
     *   accounts: ['11111111111', '22222222222'],
     *   regions: ['us-east-1', 'us-east-2'],
     * });
     */
    static fromAccounts(options) {
        return new AccountsTarget(options);
    }
    ;
    /**
     * Deploy the StackSet to a list of AWS Organizations organizational units.
     *
     * You can optionally include/exclude individual AWS accounts.
     *
     * @example
     * StackSetTarget.fromOrganizationalUnits({
     *   regions: ['us-east-1', 'us-east-2'],
     *   organizationalUnits: ['ou-1111111', 'ou-2222222'],
     * });
     */
    static fromOrganizationalUnits(options) {
        return new OrganizationsTarget(options);
    }
    /**
     * @internal
     */
    _renderParameters(parameters) {
        if (!parameters)
            return undefined;
        const overrides = [];
        for (const [key, value] of Object.entries(parameters ?? {})) {
            overrides.push({
                parameterKey: key,
                parameterValue: value,
            });
        }
        return overrides;
    }
}
exports.StackSetTarget = StackSetTarget;
class AccountsTarget extends StackSetTarget {
    constructor(options) {
        super();
        this.options = options;
    }
    _bind(_scope, _options = {}) {
        return {
            regions: this.options.regions,
            parameterOverrides: this._renderParameters(this.options.parameterOverrides),
            accountFilterType: AccountFilterType.INTERSECTION,
            accounts: this.options.accounts,
        };
    }
}
class OrganizationsTarget extends StackSetTarget {
    constructor(options) {
        super();
        this.options = options;
    }
    _bind(_scope, _options = {}) {
        if (this.options.excludeAccounts && this.options.additionalAccounts) {
            throw new Error("cannot specify both 'excludeAccounts' and 'additionalAccounts'");
        }
        const filterType = this.options.additionalAccounts ? AccountFilterType.UNION
            : this.options.excludeAccounts ? AccountFilterType.DIFFERENCE
                : AccountFilterType.NONE;
        return {
            regions: this.options.regions,
            parameterOverrides: this._renderParameters(this.options.parameterOverrides),
            accountFilterType: filterType,
            organizationalUnits: this.options.organizationalUnits,
            accounts: this.options.additionalAccounts ?? this.options.excludeAccounts,
        };
    }
}
var PermissionModel;
(function (PermissionModel) {
    PermissionModel["SERVICE_MANAGED"] = "SERVICE_MANAGED";
    PermissionModel["SELF_MANAGED"] = "SELF_MANAGED";
})(PermissionModel || (PermissionModel = {}));
class DeploymentType {
    /**
     * StackSets deployed using service managed permissions allow you to deploy
     * StackSet instances to accounts within an AWS Organization. Using this module
     * AWS Organizations will handle creating the necessary IAM roles and setting up the
     * required permissions.
     *
     * This model also allows you to enable automated deployments which allows the StackSet
     * to be automatically deployed to new accounts that are added to your organization in the future.
     *
     * This model requires you to be operating in either the AWS Organizations management account
     * or the delegated administrator account
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-concepts.html#stacksets-concepts-stackset-permission-models
     */
    static serviceManaged(options = {}) {
        return new ManagedDeploymentType(options);
    }
    /**
     * StackSets deployed using the self managed model require you to create the necessary
     * IAM roles in the source and target AWS accounts and to setup the required IAM permissions.
     *
     * Using this model you can only deploy to AWS accounts that have the necessary IAM roles/permissions
     * pre-created.
     */
    static selfManaged(options = {}) {
        return new SelfDeploymentType(options);
    }
}
exports.DeploymentType = DeploymentType;
class ManagedDeploymentType extends DeploymentType {
    constructor(options) {
        super();
        this.options = options;
    }
    _bind(_scope, _options = {}) {
        const autoDeployEnabled = this.options?.autoDeployEnabled ?? true;
        if (!autoDeployEnabled && this.options?.autoDeployRetainStacks !== undefined) {
            throw new Error('autoDeployRetainStacks only applies if autoDeploy is enabled');
        }
        return {
            permissionsModel: PermissionModel.SERVICE_MANAGED,
            autoDeployEnabled,
            callAs: (this.options?.delegatedAdmin ?? true) ? CallAs.DELEGATED_ADMIN : CallAs.SELF,
            autoDeployRetainStacks: autoDeployEnabled ? (this.options?.autoDeployRetainStacks ?? true)
                : undefined,
        };
    }
}
class SelfDeploymentType extends DeploymentType {
    constructor(options) {
        super();
        this.options = options;
    }
    _bind(_scope, _options = {}) {
        return {
            permissionsModel: PermissionModel.SELF_MANAGED,
            adminRole: this.options?.adminRole,
            executionRoleName: this.options?.executionRoleName,
        };
    }
}
/**
 * Indicates whether a service managed stackset is deployed from the
 * AWS Organizations management account or the delegated admin account
 */
var CallAs;
(function (CallAs) {
    /**
     * The StackSet is deployed from the Delegated Admin account
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-delegated-admin.html
     */
    CallAs["DELEGATED_ADMIN"] = "DELEGATED_ADMIN";
    /**
     * The StackSet is deployed from the Management account
     */
    CallAs["SELF"] = "SELF";
})(CallAs || (CallAs = {}));
/**
 * StackSets that contains certain functionality require an explicit acknowledgement
 * that the stack contains these capabilities.
 */
var Capability;
(function (Capability) {
    /**
     * Required if the stack contains IAM resources with custom names
     */
    Capability["NAMED_IAM"] = "CAPABILITY_NAMED_IAM";
    /**
     * Required if the stack contains IAM resources. If the IAM resources
     * also have custom names then specify {@link Capability.NAMED_IAM} instead.
     */
    Capability["IAM"] = "CAPABILITY_IAM";
    /**
     * Required if the stack contains macros. Not supported if deploying
     * a service managed stackset.
     */
    Capability["AUTO_EXPAND"] = "CAPABILITY_AUTO_EXPAND";
})(Capability = exports.Capability || (exports.Capability = {}));
/**
 * The type of concurrency to use when deploying the StackSet to regions.
 */
var RegionConcurrencyType;
(function (RegionConcurrencyType) {
    /**
     * Deploy the StackSet to regions sequentially in the order specified in
     * {@link StackSetProps.operationPreferences.regionOrder}.
     *
     * This is the default behavior.
     */
    RegionConcurrencyType["SEQUENTIAL"] = "SEQUENTIAL";
    /**
     * Deploy the StackSet to all regions in parallel.
     */
    RegionConcurrencyType["PARALLEL"] = "PARALLEL";
})(RegionConcurrencyType = exports.RegionConcurrencyType || (exports.RegionConcurrencyType = {}));
/**
 * AWS Regions introduced after March 20, 2019, such as Asia Pacific (Hong Kong), are disabled by default.
 * Be aware that to deploy stack instances into a target account that resides in a Region that's disabled by default,
 * you will also need to include the regional service principal for that Region.
 * Each Region that's disabled by default will have its own regional service principal.
 */
const ENABLED_REGIONS = [
    'us-east-1',
    'eu-west-1',
    'us-west-1',
    'ap-southeast-1',
    'ap-northeast-1',
    'us-gov-west-1',
    'us-west-2',
    'sa-east-1',
    'ap-southeast-2',
    'cn-north-1',
    'eu-central-1',
    'ap-northeast-2',
    'ap-south-1',
    'us-east-2',
    'ca-central-1',
    'eu-west-2',
    'cn-northwest-1',
    'eu-west-3',
    'ap-northeast-3',
    'us-gov-east-1',
    'eu-north-1',
    'eu-south-2', // Europe (Spain)
];
// disabled regions
// 'af-south-1', // Africa (Cape Town)
// 'ap-southeast-3', // Asia Pacific (Jakarta)
// 'ap-east-1', // Asia Pacific (Hong Kong)
// 'eu-south-1', // Europe (Milan)
// 'me-south-1', // Middle East (Bahrain)
class StackSet extends aws_cdk_lib_1.Resource {
    /**
     * Creates a new StackSet.
     *
     * @param scope The scope in which to define this StackSet.
     * @param id The ID of the StackSet.
     * @param props The properties of the StackSet.
     */
    constructor(scope, id, props) {
        super(scope, id, {
            physicalName: props.stackSetName ?? aws_cdk_lib_1.Lazy.string({ produce: () => aws_cdk_lib_1.Names.uniqueResourceName(this, {}) }),
        });
        this.stackInstances = [];
        const deploymentTypeConfig = (props.deploymentType ?? DeploymentType.selfManaged())._bind(this);
        if (deploymentTypeConfig.permissionsModel === PermissionModel.SELF_MANAGED) {
            this._role = deploymentTypeConfig.adminRole ?? new aws_cdk_lib_1.aws_iam.Role(scope, 'AdminRole', {
                assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal('cloudformation.amazonaws.com'),
            });
            this._role.addToPrincipalPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
                effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: [
                    aws_cdk_lib_1.Stack.of(this).formatArn({
                        service: 'iam',
                        region: '',
                        account: '*',
                        resource: 'role',
                        resourceName: deploymentTypeConfig.executionRoleName ?? 'AWSCloudFormationStackSetExecutionRole',
                    }),
                ],
            }));
        }
        if (props.capabilities?.includes(Capability.AUTO_EXPAND) && deploymentTypeConfig.permissionsModel === PermissionModel.SERVICE_MANAGED) {
            throw new Error('service managed stacksets do not current support the "AUTO_EXPAND" capability');
        }
        this.permissionModel = deploymentTypeConfig.permissionsModel;
        this.addTarget(props.target);
        const stackSet = new aws_cdk_lib_1.aws_cloudformation.CfnStackSet(this, 'Resource', {
            autoDeployment: undefinedIfNoKeys({
                enabled: deploymentTypeConfig.autoDeployEnabled,
                retainStacksOnAccountRemoval: deploymentTypeConfig.autoDeployRetainStacks,
            }),
            executionRoleName: deploymentTypeConfig.executionRoleName,
            administrationRoleArn: this._role?.roleArn,
            description: props.description,
            managedExecution: {
                Active: props.managedExecution ?? true,
            },
            operationPreferences: props.operationPreferences ? undefinedIfNoKeys(props.operationPreferences) : undefined,
            stackSetName: this.physicalName,
            capabilities: props.capabilities,
            permissionModel: deploymentTypeConfig.permissionsModel,
            callAs: deploymentTypeConfig.callAs,
            templateUrl: props.template.templateUrl,
            stackInstancesGroup: aws_cdk_lib_1.Lazy.any({
                produce: () => {
                    return this.stackInstances;
                },
            }),
            ...(props.parameters ? {
                parameters: Object.entries(props.parameters).map((entry) => {
                    return {
                        parameterKey: entry[0],
                        parameterValue: entry[1],
                    };
                }),
            } : {}),
        });
        // the file asset bucket deployment needs to complete before the stackset can deploy
        for (const fileAssetResourceName of stackset_stack_1.fileAssetResourceNames) {
            const fileAssetResource = scope.node.tryFindChild(fileAssetResourceName);
            fileAssetResource && stackSet.node.addDependency(fileAssetResource);
        }
    }
    get role() {
        if (!this._role) {
            throw new Error('service managed StackSets do not have an associated role');
        }
        return this._role;
    }
    /**
     * Adds a target to the StackSet.
     *
     * @param target the target to add to the StackSet
     */
    addTarget(target) {
        const targetConfig = target._bind(this);
        if (this._role && this._role instanceof aws_cdk_lib_1.aws_iam.Role) {
            const disabledPrincipals = [];
            targetConfig.regions.forEach(region => {
                if (!ENABLED_REGIONS.includes(region)) {
                    disabledPrincipals.push(new aws_cdk_lib_1.aws_iam.ServicePrincipal(`cloudformation.${region}.${aws_cdk_lib_1.Stack.of(this).urlSuffix}`));
                }
            });
            if (disabledPrincipals.length > 0) {
                this._role.assumeRolePolicy?.addStatements(new aws_cdk_lib_1.aws_iam.PolicyStatement({
                    effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
                    actions: ['sts:AssumeRole'],
                    principals: disabledPrincipals,
                }));
            }
        }
        this.stackInstances.push({
            regions: targetConfig.regions,
            parameterOverrides: targetConfig.parameterOverrides,
            deploymentTargets: {
                accounts: targetConfig.accounts,
                accountFilterType: this.permissionModel === PermissionModel.SERVICE_MANAGED
                    ? targetConfig.accountFilterType
                    : undefined,
                organizationalUnitIds: targetConfig.organizationalUnits,
            },
        });
    }
}
exports.StackSet = StackSet;
function undefinedIfNoKeys(obj) {
    const allUndefined = Object.values(obj).every(val => val === undefined);
    return allUndefined ? undefined : obj;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2tzZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGFja3NldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FRcUI7QUFFckIscURBQXlFO0FBRXpFOztHQUVHO0FBQ0gsTUFBc0IsZ0JBQWdCO0lBQ3BDOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLGlCQUFpQixDQUFDLEtBQW9CO1FBQ2xELE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUM7SUFDbEQsQ0FBQztDQU1GO0FBZkQsNENBZUM7QUFFRDs7R0FFRztBQUNILElBQUssaUJBcUJKO0FBckJELFdBQUssaUJBQWlCO0lBQ3BCOztPQUVHO0lBQ0gsa0RBQTZCLENBQUE7SUFFN0I7O09BRUc7SUFDSCw4Q0FBeUIsQ0FBQTtJQUV6Qjs7O09BR0c7SUFDSCxvQ0FBZSxDQUFBO0lBRWY7O09BRUc7SUFDSCxrQ0FBYSxDQUFBO0FBQ2YsQ0FBQyxFQXJCSSxpQkFBaUIsS0FBakIsaUJBQWlCLFFBcUJyQjtBQTBGRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBOEJHO0FBQ0gsTUFBc0IsY0FBYztJQUNsQzs7Ozs7Ozs7T0FRRztJQUNJLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBOEI7UUFDdkQsT0FBTyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBQUEsQ0FBQztJQUVGOzs7Ozs7Ozs7O09BVUc7SUFDSSxNQUFNLENBQUMsdUJBQXVCLENBQUMsT0FBbUM7UUFDdkUsT0FBTyxJQUFJLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNPLGlCQUFpQixDQUFDLFVBQThCO1FBQ3hELElBQUksQ0FBQyxVQUFVO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFDbEMsTUFBTSxTQUFTLEdBQWdCLEVBQUUsQ0FBQztRQUNsQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVB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TSxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDeEUsT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBhd3NfY2xvdWRmb3JtYXRpb24gYXMgY2ZuLFxuICBhd3NfaWFtIGFzIGlhbSxcbiAgSVJlc291cmNlLFxuICBMYXp5LFxuICBOYW1lcyxcbiAgUmVzb3VyY2UsXG4gIFN0YWNrLFxufSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFN0YWNrU2V0U3RhY2ssIGZpbGVBc3NldFJlc291cmNlTmFtZXMgfSBmcm9tICcuL3N0YWNrc2V0LXN0YWNrJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgU3RhY2tTZXQgQ2xvdWRGb3JtYXRpb24gdGVtcGxhdGVcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFN0YWNrU2V0VGVtcGxhdGUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIFN0YWNrU2V0VGVtcGxhdGUgZnJvbSBhIFN0YWNrU2V0U3RhY2tcbiAgICpcbiAgICogQHBhcmFtIHN0YWNrIHRoZSBzdGFjayB0byB1c2UgYXMgdGhlIGJhc2UgZm9yIHRoZSBzdGFja3NldCB0ZW1wbGF0ZVxuICAgKiBAcmV0dXJucyBTdGFja1NldFRlbXBsYXRlXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGZyb21TdGFja1NldFN0YWNrKHN0YWNrOiBTdGFja1NldFN0YWNrKTogU3RhY2tTZXRUZW1wbGF0ZSB7XG4gICAgcmV0dXJuIHsgdGVtcGxhdGVVcmw6IHN0YWNrLl9nZXRUZW1wbGF0ZVVybCgpIH07XG4gIH1cblxuICAvKipcbiAgICogVGhlIFMzIFVSTCBvZiB0aGUgU3RhY2tTZXQgdGVtcGxhdGVcbiAgICovXG4gIHB1YmxpYyBhYnN0cmFjdCByZWFkb25seSB0ZW1wbGF0ZVVybDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFRoZSB0eXBlIG9mIFN0YWNrU2V0IGFjY291bnQgZmlsdGVyXG4gKi9cbmVudW0gQWNjb3VudEZpbHRlclR5cGUge1xuICAvKipcbiAgICogX09ubHlfIGRlcGxveXMgdG8gc3BlY2lmaWVkIGFjY291bnRzXG4gICAqL1xuICBJTlRFUlNFQ1RJT04gPSAnSU5URVJTRUNUSU9OJyxcblxuICAvKipcbiAgICogX0RvZXMgbm90XyBkZXBsb3kgdG8gdGhlIHNwZWNpZmllZCBhY2NvdW50c1xuICAgKi9cbiAgRElGRkVSRU5DRSA9ICdESUZGRVJFTkNFJyxcblxuICAvKipcbiAgICogKGRlZmF1bHQgdmFsdWUpIGluY2x1ZGUgYm90aCBPVXMgYW5kIEFjY291bnRzXG4gICAqIEFsbG93cyB5b3UgdG8gZGVwbG95IHRvIGFuIE9VIF9hbmRfIHNwZWNpZmljIGFjY291bnRzIGluIGEgZGlmZmVyZW50IE9VXG4gICAqL1xuICBVTklPTiA9ICdVTklPTicsXG5cbiAgLyoqXG4gICAqIE9ubHkgZGVwbG95IHRvIGFjY291bnRzIGluIGFuIE9VXG4gICAqL1xuICBOT05FID0gJ05PTkUnLFxufVxuXG4vKipcbiAqIENsb3VkRm9ybWF0aW9uIHN0YWNrIHBhcmFtZXRlcnNcbiAqL1xuZXhwb3J0IHR5cGUgU3RhY2tTZXRQYXJhbWV0ZXIgPSB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xuXG4vKipcbiAqIENvbW1vbiBvcHRpb25zIGZvciBkZXBsb3lpbmcgYSBTdGFja1NldCB0byBhIHRhcmdldFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRhcmdldE9wdGlvbnMge1xuICAvKipcbiAgICogQSBsaXN0IG9mIHJlZ2lvbnMgdGhlIFN0YWNrIHNob3VsZCBiZSBkZXBsb3llZCB0by5cbiAgICpcbiAgICogSWYge0BsaW5rIFN0YWNrU2V0UHJvcHMub3BlcmF0aW9uUHJlZmVyZW5jZXMucmVnaW9uT3JkZXJ9IGlzIHNwZWNpZmllZFxuICAgKiB0aGVuIHRoZSBTdGFja1NldCB3aWxsIGJlIGRlcGxveWVkIHNlcXVlbnRpYWxseSBvdGhlcndpc2UgaXQgd2lsbCBiZVxuICAgKiBkZXBsb3llZCB0byBhbGwgcmVnaW9ucyBpbiBwYXJhbGxlbC5cbiAgICovXG4gIHJlYWRvbmx5IHJlZ2lvbnM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBQYXJhbWV0ZXIgb3ZlcnJpZGVzIHRoYXQgc2hvdWxkIGJlIGFwcGxpZWQgdG8gb25seSB0aGlzIHRhcmdldFxuICAgKlxuICAgKiBAZGVmYXVsdCAtIHVzZSBwYXJhbWV0ZXIgb3ZlcnJpZGVzIHNwZWNpZmllZCBpbiB7QGxpbmsgU3RhY2tTZXRQcm9wcy5wYXJhbWV0ZXJPdmVycmlkZXN9XG4gICAqL1xuICByZWFkb25seSBwYXJhbWV0ZXJPdmVycmlkZXM/OiBTdGFja1NldFBhcmFtZXRlcjtcbn1cblxuLyoqXG4gKiBPcHRpb25zIGZvciBkZXBsb3lpbmcgYSBTdGFja1NldCB0byBhIHNldCBvZiBPcmdhbml6YXRpb25hbCBVbml0cyAoT1VzKVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9yZ2FuaXphdGlvbnNUYXJnZXRPcHRpb25zIGV4dGVuZHMgVGFyZ2V0T3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGxpc3Qgb2Ygb3JnYW5pemF0aW9uYWwgdW5pdCBpZHMgdG8gZGVwbG95IHRvLiBUaGUgU3RhY2tTZXQgd2lsbFxuICAgKiBkZXBsb3kgdGhlIHByb3ZpZGVkIFN0YWNrIHRlbXBsYXRlIHRvIGFsbCBhY2NvdW50cyBpbiB0aGUgT1UuXG4gICAqIFRoaXMgY2FuIGJlIGZ1cnRoZXIgZmlsdGVyZWQgYnkgc3BlY2lmeWluZyBlaXRoZXIgYGFkZGl0aW9uYWxBY2NvdW50c2BcbiAgICogb3IgYGV4Y2x1ZGVBY2NvdW50c2AuXG4gICAqXG4gICAqIElmIHRoZSBgZGVwbG95bWVudFR5cGVgIGlzIHNwZWNpZmllZCB3aXRoIGBhdXRvRGVwbG95RW5hYmxlZGAgdGhlblxuICAgKiB0aGUgU3RhY2tTZXQgd2lsbCBhdXRvbWF0aWNhbGx5IGRlcGxveSB0aGUgU3RhY2sgdG8gbmV3IGFjY291bnRzIGFzIHRoZXlcbiAgICogYXJlIGFkZGVkIHRvIHRoZSBzcGVjaWZpZWQgYG9yZ2FuaXphdGlvbmFsVW5pdHNgXG4gICAqL1xuICByZWFkb25seSBvcmdhbml6YXRpb25hbFVuaXRzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogQSBsaXN0IG9mIGFkZGl0aW9uYWwgQVdTIGFjY291bnRzIHRvIGRlcGxveSB0aGUgU3RhY2tTZXQgdG8uIFRoaXMgY2FuIGJlXG4gICAqIHVzZWQgdG8gZGVwbG95IHRoZSBTdGFja1NldCB0byBhZGRpdGlvbmFsIEFXUyBhY2NvdW50cyB0aGF0IGV4aXN0IGluIGFcbiAgICogZGlmZmVyZW50IE9VIHRoYW4gd2hhdCBoYXMgYmVlbiBwcm92aWRlZCBpbiBgb3JnYW5pemF0aW9uYWxVbml0c2BcbiAgICpcbiAgICogQGRlZmF1bHQgLSBTdGFja3Mgd2lsbCBvbmx5IGJlIGRlcGxveWVkIHRvIGFjY291bnRzIHRoYXQgZXhpc3QgaW4gdGhlXG4gICAqIHNwZWNpZmllZCBvcmdhbml6YXRpb25hbFVuaXRzXG4gICAqL1xuICByZWFkb25seSBhZGRpdGlvbmFsQWNjb3VudHM/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogQSBsaXN0IG9mIEFXUyBhY2NvdW50cyB0byBleGNsdWRlIGZyb20gZGVwbG95aW5nIHRoZSBTdGFja1NldCB0by4gVGhpcyBjYW5cbiAgICogYmUgdXNlZnVsIGlmIHRoZXJlIGFyZSBhY2NvdW50cyB0aGF0IGV4aXN0IGluIGFuIE9VIHRoYXQgaXMgcHJvdmlkZWQgaW5cbiAgICogYG9yZ2FuaXphdGlvbmFsVW5pdHNgLCBidXQgeW91IGRvIG5vdCB3YW50IHRoZSBTdGFja1NldCB0byBiZSBkZXBsb3llZC5cbiAgICpcbiAgICogQGRlZmF1bHQgLSBTdGFja3Mgd2lsbCBiZSBkZXBsb3llZCB0byBhbGwgYWNjb3VudHMgdGhhdCBleGlzdCBpbiB0aGUgT1VzXG4gICAqIHNwZWNpZmllZCBpbiB0aGUgb3JnYW5pemF0aW9uVW5pdHMgcHJvcGVydHlcbiAgICovXG4gIHJlYWRvbmx5IGV4Y2x1ZGVBY2NvdW50cz86IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIGRlcGxveWluZyBhIFN0YWNrU2V0IHRvIGEgbGlzdCBvZiBBV1MgYWNjb3VudHNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBY2NvdW50c1RhcmdldE9wdGlvbnMgZXh0ZW5kcyBUYXJnZXRPcHRpb25zIHtcbiAgLyoqXG4gICAqIEEgbGlzdCBvZiBBV1MgYWNjb3VudHMgdG8gZGVwbG95IHRoZSBTdGFja1NldCB0b1xuICAgKi9cbiAgcmVhZG9ubHkgYWNjb3VudHM6IHN0cmluZ1tdO1xufVxuXG5pbnRlcmZhY2UgUGFyYW1ldGVyIHtcbiAgcmVhZG9ubHkgcGFyYW1ldGVyS2V5OiBzdHJpbmc7XG4gIHJlYWRvbmx5IHBhcmFtZXRlclZhbHVlOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBTdGFja1NldFRhcmdldENvbmZpZyB7XG4gIHJlYWRvbmx5IGFjY291bnRGaWx0ZXJUeXBlOiBBY2NvdW50RmlsdGVyVHlwZTtcbiAgcmVhZG9ubHkgcmVnaW9uczogc3RyaW5nW107XG4gIHJlYWRvbmx5IHBhcmFtZXRlck92ZXJyaWRlcz86IFBhcmFtZXRlcltdO1xuICByZWFkb25seSBhY2NvdW50cz86IHN0cmluZ1tdO1xuICByZWFkb25seSBvcmdhbml6YXRpb25hbFVuaXRzPzogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBUYXJnZXRCaW5kT3B0aW9ucyB7fVxuXG4vKipcbiAqIFdoaWNoIG9yZ2FuaXphdGlvbmFsIHVuaXRzIGFuZC9vciBhY2NvdW50cyB0aGUgc3RhY2sgc2V0XG4gKiBzaG91bGQgYmUgZGVwbG95ZWQgdG8uXG4gKlxuICogYGZyb21BY2NvdW50c2AgY2FuIGJlIHVzZWQgdG8gZGVwbG95IHRoZSBzdGFjayBzZXQgdG8gc3BlY2lmaWMgQVdTIGFjY291bnRzXG4gKlxuICogYGZyb21Pcmdhbml6YXRpb25hbFVuaXRzYCBjYW4gYmUgdXNlZCB0byBkZXBsb3kgdGhlIHN0YWNrIHNldCB0byBzcGVjaWZpYyBvcmdhbml6YXRpb25hbCB1bml0c1xuICogYW5kIG9wdGlvbmFsbHkgaW5jbHVkZSBhZGRpdGlvbmFsIGFjY291bnRzIGZyb20gb3RoZXIgT1VzLCBvciBleGNsdWRlIGFjY291bnRzIGZyb20gdGhlIHNwZWNpZmllZFxuICogT1VzXG4gKlxuICogQGV4YW1wbGVcbiAqIC8vIGRlcGxveSB0byBzcGVjaWZpYyBhY2NvdW50c1xuICogU3RhY2tTZXRUYXJnZXQuZnJvbUFjY291bnRzKHtcbiAqICAgYWNjb3VudHM6IFsnMTExMTExMTExMTEnLCAnMjIyMjIyMjIyMjInXSxcbiAqICAgcmVnaW9uczogWyd1cy1lYXN0LTEnLCAndXMtZWFzdC0yJ10sXG4gKiB9KTtcbiAqXG4gKiAvLyBkZXBsb3kgdG8gT1VzIGFuZCAxIGFkZGl0aW9uYWwgYWNjb3VudFxuICogU3RhY2tTZXRUYXJnZXQuZnJvbU9yZ2FuaXphdGlvbmFsVW5pdHMoe1xuICogICByZWdpb25zOiBbJ3VzLWVhc3QtMScsICd1cy1lYXN0LTInXSxcbiAqICAgb3JnYW5pemF0aW9uYWxVbml0czogWydvdS0xMTExMTExJywgJ291LTIyMjIyMjInXSxcbiAqICAgYWRkaXRpb25hbEFjY291bnRzOiBbJzMzMzMzMzMzMzMzJ10sXG4gKiB9KTtcbiAqXG4gKiAvLyBkZXBsb3kgdG8gT1VzIGJ1dCBleGNsdWRlIDEgYWNjb3VudFxuICogU3RhY2tTZXRUYXJnZXQuZnJvbU9yZ2FuaXphdGlvbmFsVW5pdHMoe1xuICogICByZWdpb25zOiBbJ3VzLWVhc3QtMScsICd1cy1lYXN0LTInXSxcbiAqICAgb3JnYW5pemF0aW9uYWxVbml0czogWydvdS0xMTExMTExJywgJ291LTIyMjIyMjInXSxcbiAqICAgZXhjbHVkZUFjY291bnRzOiBbJzExMTExMTExMTExJ10sXG4gKiB9KTtcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFN0YWNrU2V0VGFyZ2V0IHtcbiAgLyoqXG4gICAqIERlcGxveSB0aGUgU3RhY2tTZXQgdG8gYSBsaXN0IG9mIGFjY291bnRzXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIFN0YWNrU2V0VGFyZ2V0LmZyb21BY2NvdW50cyh7XG4gICAqICAgYWNjb3VudHM6IFsnMTExMTExMTExMTEnLCAnMjIyMjIyMjIyMjInXSxcbiAgICogICByZWdpb25zOiBbJ3VzLWVhc3QtMScsICd1cy1lYXN0LTInXSxcbiAgICogfSk7XG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGZyb21BY2NvdW50cyhvcHRpb25zOiBBY2NvdW50c1RhcmdldE9wdGlvbnMpOiBTdGFja1NldFRhcmdldCB7XG4gICAgcmV0dXJuIG5ldyBBY2NvdW50c1RhcmdldChvcHRpb25zKTtcbiAgfTtcblxuICAvKipcbiAgICogRGVwbG95IHRoZSBTdGFja1NldCB0byBhIGxpc3Qgb2YgQVdTIE9yZ2FuaXphdGlvbnMgb3JnYW5pemF0aW9uYWwgdW5pdHMuXG4gICAqXG4gICAqIFlvdSBjYW4gb3B0aW9uYWxseSBpbmNsdWRlL2V4Y2x1ZGUgaW5kaXZpZHVhbCBBV1MgYWNjb3VudHMuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIFN0YWNrU2V0VGFyZ2V0LmZyb21Pcmdhbml6YXRpb25hbFVuaXRzKHtcbiAgICogICByZWdpb25zOiBbJ3VzLWVhc3QtMScsICd1cy1lYXN0LTInXSxcbiAgICogICBvcmdhbml6YXRpb25hbFVuaXRzOiBbJ291LTExMTExMTEnLCAnb3UtMjIyMjIyMiddLFxuICAgKiB9KTtcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZnJvbU9yZ2FuaXphdGlvbmFsVW5pdHMob3B0aW9uczogT3JnYW5pemF0aW9uc1RhcmdldE9wdGlvbnMpOiBTdGFja1NldFRhcmdldCB7XG4gICAgcmV0dXJuIG5ldyBPcmdhbml6YXRpb25zVGFyZ2V0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcHJvdGVjdGVkIF9yZW5kZXJQYXJhbWV0ZXJzKHBhcmFtZXRlcnM/OiBTdGFja1NldFBhcmFtZXRlcik6IFBhcmFtZXRlcltdIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXBhcmFtZXRlcnMpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY29uc3Qgb3ZlcnJpZGVzOiBQYXJhbWV0ZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBhcmFtZXRlcnMgPz8ge30pKSB7XG4gICAgICBvdmVycmlkZXMucHVzaCh7XG4gICAgICAgIHBhcmFtZXRlcktleToga2V5LFxuICAgICAgICBwYXJhbWV0ZXJWYWx1ZTogdmFsdWUsXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG92ZXJyaWRlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIGNvbmZpZ3VyYXRpb24gZm9yIGEgU3RhY2tTZXQgdGFyZ2V0XG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcHVibGljIGFic3RyYWN0IF9iaW5kKHNjb3BlOiBDb25zdHJ1Y3QsIG9wdGlvbnM/OiBUYXJnZXRCaW5kT3B0aW9ucyk6IFN0YWNrU2V0VGFyZ2V0Q29uZmlnO1xufVxuXG5jbGFzcyBBY2NvdW50c1RhcmdldCBleHRlbmRzIFN0YWNrU2V0VGFyZ2V0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBBY2NvdW50c1RhcmdldE9wdGlvbnMpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgcHVibGljIF9iaW5kKF9zY29wZTogQ29uc3RydWN0LCBfb3B0aW9uczogVGFyZ2V0QmluZE9wdGlvbnMgPSB7fSk6IFN0YWNrU2V0VGFyZ2V0Q29uZmlnIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVnaW9uczogdGhpcy5vcHRpb25zLnJlZ2lvbnMsXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHRoaXMuX3JlbmRlclBhcmFtZXRlcnModGhpcy5vcHRpb25zLnBhcmFtZXRlck92ZXJyaWRlcyksXG4gICAgICBhY2NvdW50RmlsdGVyVHlwZTogQWNjb3VudEZpbHRlclR5cGUuSU5URVJTRUNUSU9OLFxuICAgICAgYWNjb3VudHM6IHRoaXMub3B0aW9ucy5hY2NvdW50cyxcbiAgICB9O1xuICB9XG59XG5cbmNsYXNzIE9yZ2FuaXphdGlvbnNUYXJnZXQgZXh0ZW5kcyBTdGFja1NldFRhcmdldCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogT3JnYW5pemF0aW9uc1RhcmdldE9wdGlvbnMpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgcHVibGljIF9iaW5kKF9zY29wZTogQ29uc3RydWN0LCBfb3B0aW9uczogVGFyZ2V0QmluZE9wdGlvbnMgPSB7fSk6IFN0YWNrU2V0VGFyZ2V0Q29uZmlnIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmV4Y2x1ZGVBY2NvdW50cyAmJiB0aGlzLm9wdGlvbnMuYWRkaXRpb25hbEFjY291bnRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjYW5ub3Qgc3BlY2lmeSBib3RoICdleGNsdWRlQWNjb3VudHMnIGFuZCAnYWRkaXRpb25hbEFjY291bnRzJ1wiKTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWx0ZXJUeXBlID0gdGhpcy5vcHRpb25zLmFkZGl0aW9uYWxBY2NvdW50cyA/IEFjY291bnRGaWx0ZXJUeXBlLlVOSU9OXG4gICAgICA6IHRoaXMub3B0aW9ucy5leGNsdWRlQWNjb3VudHMgPyBBY2NvdW50RmlsdGVyVHlwZS5ESUZGRVJFTkNFXG4gICAgICAgIDogQWNjb3VudEZpbHRlclR5cGUuTk9ORTtcbiAgICByZXR1cm4ge1xuICAgICAgcmVnaW9uczogdGhpcy5vcHRpb25zLnJlZ2lvbnMsXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHRoaXMuX3JlbmRlclBhcmFtZXRlcnModGhpcy5vcHRpb25zLnBhcmFtZXRlck92ZXJyaWRlcyksXG4gICAgICBhY2NvdW50RmlsdGVyVHlwZTogZmlsdGVyVHlwZSxcbiAgICAgIG9yZ2FuaXphdGlvbmFsVW5pdHM6IHRoaXMub3B0aW9ucy5vcmdhbml6YXRpb25hbFVuaXRzLFxuICAgICAgYWNjb3VudHM6IHRoaXMub3B0aW9ucy5hZGRpdGlvbmFsQWNjb3VudHMgPz8gdGhpcy5vcHRpb25zLmV4Y2x1ZGVBY2NvdW50cyxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogT3B0aW9ucyBmb3IgU3RhY2tTZXRzIHRoYXQgYXJlIG1hbmFnZWQgYnkgQVdTIE9yZ2FuaXphdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmljZU1hbmFnZWRPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgb3Igbm90IHRoZSBTdGFja1NldCBzaG91bGQgYXV0b21hdGljYWxseSBjcmVhdGUvcmVtb3ZlIHRoZSBTdGFja1xuICAgKiBmcm9tIEFXUyBhY2NvdW50cyB0aGF0IGFyZSBhZGRlZC9yZW1vdmVkIGZyb20gYW4gb3JnYW5pemF0aW9uYWwgdW5pdC5cbiAgICpcbiAgICogVGhpcyBoYXMgbm8gZWZmZWN0IGlmIHtAbGluayBTdGFja1NldFRhcmdldC5mcm9tQWNjb3VudHN9IGlzIHVzZWRcbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgYXV0b0RlcGxveUVuYWJsZWQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHN0YWNrcyBzaG91bGQgYmUgcmVtb3ZlZCBmcm9tIEFXUyBhY2NvdW50cyB0aGF0IGFyZSByZW1vdmVkXG4gICAqIGZyb20gYW4gb3JnYW5pemF0aW9uYWwgdW5pdC5cbiAgICpcbiAgICogQnkgZGVmYXVsdCB0aGUgc3RhY2sgd2lsbCBiZSByZXRhaW5lZCAobm90IGRlbGV0ZWQpXG4gICAqXG4gICAqIFRoaXMgaGFzIG5vIGVmZmVjdCBpZiB7QGxpbmsgU3RhY2tTZXRUYXJnZXQuZnJvbUFjY291bnRzfSBpcyB1c2VkXG4gICAqXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIHJlYWRvbmx5IGF1dG9EZXBsb3lSZXRhaW5TdGFja3M/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG9yIG5vdCB0aGUgYWNjb3VudCB0aGlzIFN0YWNrU2V0IGlzIGRlcGxveWVkIGZyb20gaXMgdGhlIGRlbGVnYXRlZCBhZG1pbiBhY2NvdW50LlxuICAgKlxuICAgKiBTZXQgdGhpcyB0byBgZmFsc2VgIGlmIHlvdSBhcmUgdXNpbmcgdGhlIEFXUyBPcmdhbml6YXRpb25zIG1hbmFnZW1lbnQgYWNjb3VudCBpbnN0ZWFkLlxuICAgKlxuICAgKiBAc2VlIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NDbG91ZEZvcm1hdGlvbi9sYXRlc3QvVXNlckd1aWRlL3N0YWNrc2V0cy1vcmdzLWRlbGVnYXRlZC1hZG1pbi5odG1sXG4gICAqXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIHJlYWRvbmx5IGRlbGVnYXRlZEFkbWluPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBPcHRpb25zIGZvciBTdGFja1NldHMgdGhhdCBhcmUgbm90IG1hbmFnZWQgYnkgQVdTIE9yZ2FuaXphdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZk1hbmFnZWRPcHRpb25zIHtcbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBzdGFja3NldCBleGVjdXRpb24gcm9sZSB0aGF0IGFscmVhZHkgZXhpc3RzIGluIGVhY2ggdGFyZ2V0IEFXUyBhY2NvdW50LlxuICAgKiBUaGlzIHJvbGUgbXVzdCBiZSBjb25maWd1cmVkIHdpdGggYSB0cnVzdCBwb2xpY3kgdGhhdCBhbGxvd3MgYHN0czpBc3N1bWVSb2xlYCBmcm9tIHRoZSBgYWRtaW5Sb2xlYC5cbiAgICpcbiAgICogSW4gYWRkaXRpb24gdGhpcyByb2xlIG11c3QgaGF2ZSB0aGUgbmVjZXNzYXJ5IHBlcm1pc3Npb25zIHRvIG1hbmFnZSB0aGUgcmVzb3VyY2VzIGNyZWF0ZWQgYnkgdGhlIHN0YWNrc2V0LlxuICAgKlxuICAgKiBAc2VlIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NDbG91ZEZvcm1hdGlvbi9sYXRlc3QvVXNlckd1aWRlL3N0YWNrc2V0cy1wcmVyZXFzLXNlbGYtbWFuYWdlZC5odG1sI3N0YWNrc2V0cy1wcmVyZXFzLWFjY291bnRzZXR1cFxuICAgKlxuICAgKiBAZGVmYXVsdCAtIEFXU0Nsb3VkRm9ybWF0aW9uU3RhY2tTZXRFeGVjdXRpb25Sb2xlXG4gICAqL1xuICByZWFkb25seSBleGVjdXRpb25Sb2xlTmFtZT86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGFkbWluIHJvbGUgdGhhdCBDbG91ZEZvcm1hdGlvbiB3aWxsIHVzZSB0byBwZXJmb3JtIHN0YWNrc2V0IG9wZXJhdGlvbnMuXG4gICAqIFRoaXMgcm9sZSBzaG91bGQgb25seSBoYXZlIHBlcm1pc3Npb25zIHRvIGJlIGFzc3VtZWQgYnkgdGhlIENsb3VkRm9ybWF0aW9uIHNlcnZpY2VcbiAgICogYW5kIHRvIGFzc3VtZSB0aGUgZXhlY3V0aW9uIHJvbGUgaW4gZWFjaCBpbmRpdmlkdWFsIGFjY291bnQuXG4gICAqXG4gICAqIFdoZW4geW91IGNyZWF0ZSB0aGUgZXhlY3V0aW9uIHJvbGUgaXQgbXVzdCBoYXZlIGFuIGFzc3VtZSByb2xlIHBvbGljeSBzdGF0ZW1lbnQgd2hpY2hcbiAgICogYWxsb3dzIGBzdHM6QXNzdW1lUm9sZWAgZnJvbSB0aGlzIGFkbWluIHJvbGUuXG4gICAqXG4gICAqIFRvIGdyYW50IHNwZWNpZmljIHVzZXJzL2dyb3VwcyBhY2Nlc3MgdG8gdXNlIHRoaXMgcm9sZSB0byBkZXBsb3kgc3RhY2tzZXRzIHRoZXkgbXVzdCBoYXZlXG4gICAqIGEgcG9saWN5IHRoYXQgYWxsb3dzIGBpYW06R2V0Um9sZWAgJiBgaWFtOlBhc3NSb2xlYCBvbiB0aGlzIHJvbGUgcmVzb3VyY2UuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gYSBkZWZhdWx0IHJvbGUgd2lsbCBiZSBjcmVhdGVkXG4gICAqL1xuICByZWFkb25seSBhZG1pblJvbGU/OiBpYW0uSVJvbGU7XG59XG5cbmVudW0gUGVybWlzc2lvbk1vZGVsIHtcbiAgU0VSVklDRV9NQU5BR0VEID0gJ1NFUlZJQ0VfTUFOQUdFRCcsXG4gIFNFTEZfTUFOQUdFRCA9ICdTRUxGX01BTkFHRUQnLFxufVxuXG5pbnRlcmZhY2UgRGVwbG95bWVudFR5cGVDb25maWcge1xuICByZWFkb25seSBwZXJtaXNzaW9uc01vZGVsOiBQZXJtaXNzaW9uTW9kZWw7XG4gIHJlYWRvbmx5IGV4ZWN1dGlvblJvbGVOYW1lPzogc3RyaW5nO1xuICByZWFkb25seSBhZG1pblJvbGU/OiBpYW0uSVJvbGU7XG4gIHJlYWRvbmx5IGF1dG9EZXBsb3lFbmFibGVkPzogYm9vbGVhbjtcbiAgcmVhZG9ubHkgYXV0b0RlcGxveVJldGFpblN0YWNrcz86IGJvb2xlYW47XG4gIHJlYWRvbmx5IGNhbGxBcz86IENhbGxBcztcbn1cblxuaW50ZXJmYWNlIERlcGxveW1lbnRUeXBlT3B0aW9ucyB7fVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRGVwbG95bWVudFR5cGUge1xuICAvKipcbiAgICogU3RhY2tTZXRzIGRlcGxveWVkIHVzaW5nIHNlcnZpY2UgbWFuYWdlZCBwZXJtaXNzaW9ucyBhbGxvdyB5b3UgdG8gZGVwbG95XG4gICAqIFN0YWNrU2V0IGluc3RhbmNlcyB0byBhY2NvdW50cyB3aXRoaW4gYW4gQVdTIE9yZ2FuaXphdGlvbi4gVXNpbmcgdGhpcyBtb2R1bGVcbiAgICogQVdTIE9yZ2FuaXphdGlvbnMgd2lsbCBoYW5kbGUgY3JlYXRpbmcgdGhlIG5lY2Vzc2FyeSBJQU0gcm9sZXMgYW5kIHNldHRpbmcgdXAgdGhlXG4gICAqIHJlcXVpcmVkIHBlcm1pc3Npb25zLlxuICAgKlxuICAgKiBUaGlzIG1vZGVsIGFsc28gYWxsb3dzIHlvdSB0byBlbmFibGUgYXV0b21hdGVkIGRlcGxveW1lbnRzIHdoaWNoIGFsbG93cyB0aGUgU3RhY2tTZXRcbiAgICogdG8gYmUgYXV0b21hdGljYWxseSBkZXBsb3llZCB0byBuZXcgYWNjb3VudHMgdGhhdCBhcmUgYWRkZWQgdG8geW91ciBvcmdhbml6YXRpb24gaW4gdGhlIGZ1dHVyZS5cbiAgICpcbiAgICogVGhpcyBtb2RlbCByZXF1aXJlcyB5b3UgdG8gYmUgb3BlcmF0aW5nIGluIGVpdGhlciB0aGUgQVdTIE9yZ2FuaXphdGlvbnMgbWFuYWdlbWVudCBhY2NvdW50XG4gICAqIG9yIHRoZSBkZWxlZ2F0ZWQgYWRtaW5pc3RyYXRvciBhY2NvdW50XG4gICAqXG4gICAqIEBzZWUgaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL0FXU0Nsb3VkRm9ybWF0aW9uL2xhdGVzdC9Vc2VyR3VpZGUvc3RhY2tzZXRzLWNvbmNlcHRzLmh0bWwjc3RhY2tzZXRzLWNvbmNlcHRzLXN0YWNrc2V0LXBlcm1pc3Npb24tbW9kZWxzXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHNlcnZpY2VNYW5hZ2VkKG9wdGlvbnM6IFNlcnZpY2VNYW5hZ2VkT3B0aW9ucyA9IHt9KTogRGVwbG95bWVudFR5cGUge1xuICAgIHJldHVybiBuZXcgTWFuYWdlZERlcGxveW1lbnRUeXBlKG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YWNrU2V0cyBkZXBsb3llZCB1c2luZyB0aGUgc2VsZiBtYW5hZ2VkIG1vZGVsIHJlcXVpcmUgeW91IHRvIGNyZWF0ZSB0aGUgbmVjZXNzYXJ5XG4gICAqIElBTSByb2xlcyBpbiB0aGUgc291cmNlIGFuZCB0YXJnZXQgQVdTIGFjY291bnRzIGFuZCB0byBzZXR1cCB0aGUgcmVxdWlyZWQgSUFNIHBlcm1pc3Npb25zLlxuICAgKlxuICAgKiBVc2luZyB0aGlzIG1vZGVsIHlvdSBjYW4gb25seSBkZXBsb3kgdG8gQVdTIGFjY291bnRzIHRoYXQgaGF2ZSB0aGUgbmVjZXNzYXJ5IElBTSByb2xlcy9wZXJtaXNzaW9uc1xuICAgKiBwcmUtY3JlYXRlZC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgc2VsZk1hbmFnZWQob3B0aW9uczogU2VsZk1hbmFnZWRPcHRpb25zID0ge30pOiBEZXBsb3ltZW50VHlwZSB7XG4gICAgcmV0dXJuIG5ldyBTZWxmRGVwbG95bWVudFR5cGUob3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBkZXBsb3ltZW50IHR5cGUgY29uZmlnXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcHVibGljIGFic3RyYWN0IF9iaW5kKHNjb3BlOiBDb25zdHJ1Y3QsIG9wdGlvbnM/OiBEZXBsb3ltZW50VHlwZU9wdGlvbnMpOiBEZXBsb3ltZW50VHlwZUNvbmZpZztcbn1cblxuY2xhc3MgTWFuYWdlZERlcGxveW1lbnRUeXBlIGV4dGVuZHMgRGVwbG95bWVudFR5cGUge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM/OiBTZXJ2aWNlTWFuYWdlZE9wdGlvbnMpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgcHVibGljIF9iaW5kKF9zY29wZTogQ29uc3RydWN0LCBfb3B0aW9uczogRGVwbG95bWVudFR5cGVPcHRpb25zID0ge30pOiBEZXBsb3ltZW50VHlwZUNvbmZpZyB7XG4gICAgY29uc3QgYXV0b0RlcGxveUVuYWJsZWQgPSB0aGlzLm9wdGlvbnM/LmF1dG9EZXBsb3lFbmFibGVkID8/IHRydWU7XG4gICAgaWYgKCFhdXRvRGVwbG95RW5hYmxlZCAmJiB0aGlzLm9wdGlvbnM/LmF1dG9EZXBsb3lSZXRhaW5TdGFja3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdhdXRvRGVwbG95UmV0YWluU3RhY2tzIG9ubHkgYXBwbGllcyBpZiBhdXRvRGVwbG95IGlzIGVuYWJsZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHBlcm1pc3Npb25zTW9kZWw6IFBlcm1pc3Npb25Nb2RlbC5TRVJWSUNFX01BTkFHRUQsXG4gICAgICBhdXRvRGVwbG95RW5hYmxlZCxcbiAgICAgIGNhbGxBczogKHRoaXMub3B0aW9ucz8uZGVsZWdhdGVkQWRtaW4gPz8gdHJ1ZSkgPyBDYWxsQXMuREVMRUdBVEVEX0FETUlOIDogQ2FsbEFzLlNFTEYsXG4gICAgICBhdXRvRGVwbG95UmV0YWluU3RhY2tzOiBhdXRvRGVwbG95RW5hYmxlZCA/ICh0aGlzLm9wdGlvbnM/LmF1dG9EZXBsb3lSZXRhaW5TdGFja3MgPz8gdHJ1ZSlcbiAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfVxufVxuXG5jbGFzcyBTZWxmRGVwbG95bWVudFR5cGUgZXh0ZW5kcyBEZXBsb3ltZW50VHlwZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgb3B0aW9ucz86IFNlbGZNYW5hZ2VkT3B0aW9ucykge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBwdWJsaWMgX2JpbmQoX3Njb3BlOiBDb25zdHJ1Y3QsIF9vcHRpb25zOiBEZXBsb3ltZW50VHlwZU9wdGlvbnMgPSB7fSk6IERlcGxveW1lbnRUeXBlQ29uZmlnIHtcbiAgICByZXR1cm4ge1xuICAgICAgcGVybWlzc2lvbnNNb2RlbDogUGVybWlzc2lvbk1vZGVsLlNFTEZfTUFOQUdFRCxcbiAgICAgIGFkbWluUm9sZTogdGhpcy5vcHRpb25zPy5hZG1pblJvbGUsXG4gICAgICBleGVjdXRpb25Sb2xlTmFtZTogdGhpcy5vcHRpb25zPy5leGVjdXRpb25Sb2xlTmFtZSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RhY2tTZXRQcm9wcyB7XG4gIC8qKlxuICAgKiBXaGljaCBhY2NvdW50cy9PVXMgYW5kIHJlZ2lvbnMgdG8gZGVwbG95IHRoZSBTdGFja1NldCB0b1xuICAgKi9cbiAgcmVhZG9ubHkgdGFyZ2V0OiBTdGFja1NldFRhcmdldDtcblxuICAvKipcbiAgICogVGhlIFN0YWNrIHRoYXQgd2lsbCBiZSBkZXBsb3llZCB0byB0aGUgdGFyZ2V0XG4gICAqL1xuICByZWFkb25seSB0ZW1wbGF0ZTogU3RhY2tTZXRUZW1wbGF0ZTtcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIHN0YWNrIHNldFxuICAgKlxuICAgKiBAZGVmYXVsdCAtIENsb3VkRm9ybWF0aW9uIGdlbmVyYXRlZCBuYW1lXG4gICAqL1xuICByZWFkb25seSBzdGFja1NldE5hbWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEFuIG9wdGlvbmFsIGRlc2NyaXB0aW9uIHRvIGFkZCB0byB0aGUgU3RhY2tTZXRcbiAgICpcbiAgICogQGRlZmF1bHQgLSBub25lXG4gICAqL1xuICByZWFkb25seSBkZXNjcmlwdGlvbj86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHR5cGUgb2YgZGVwbG95bWVudCBmb3IgdGhpcyBTdGFja1NldC4gVGhlIGRlcGxveW1lbnQgY2FuIGVpdGhlciBiZSBtYW5hZ2VkIGJ5XG4gICAqIEFXUyBPcmdhbml6YXRpb25zIChpLmUuIERlcGxveW1lbnRUeXBlLnNlcnZpY2VNYW5hZ2VkKCkpIG9yIGJ5IHRoZSBBV1MgYWNjb3VudCB0aGF0XG4gICAqIHRoZSBTdGFja1NldCBpcyBkZXBsb3llZCBmcm9tLlxuICAgKlxuICAgKiBJbiBvcmRlciB0byB1c2UgRGVwbG95bWVudFR5cGUuc2VydmljZU1hbmFnZWQoKSB0aGUgYWNjb3VudCBuZWVkcyB0byBlaXRoZXIgYmUgdGhlXG4gICAqIG9yZ2FuaXphdGlvbnMncyBtYW5hZ2VtZW50IGFjY291bnQgb3IgYSBkZWxlZ2F0ZWQgYWRtaW5pc3RyYXRvciBhY2NvdW50LlxuICAgKlxuICAgKiBAZGVmYXVsdCBEZXBsb3ltZW50VHlwZS5zZWxmTWFuYWdlZCgpXG4gICAqL1xuICByZWFkb25seSBkZXBsb3ltZW50VHlwZT86IERlcGxveW1lbnRUeXBlO1xuXG4gIC8qKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCB0aGVuIFN0YWNrU2V0cyB3aWxsIHBlcmZvcm0gbm9uLWNvbmZsaWN0aW5nIG9wZXJhdGlvbnMgY29uY3VycmVudGx5XG4gICAqIGFuZCBxdWV1ZSBhbnkgY29uZmxpY3Rpbmcgb3BlcmF0aW9ucy5cbiAgICpcbiAgICogVGhpcyBtZWFucyB0aGF0IHlvdSBjYW4gc3VibWl0IG1vcmUgdGhhbiBvbmUgb3BlcmF0aW9uIHBlciBTdGFja1NldCBhbmQgdGhleSB3aWxsIGJlXG4gICAqIGV4ZWN1dGVkIGNvbmN1cnJlbnRseS4gRm9yIGV4YW1wbGUgeW91IGNhbiBzdWJtaXQgYSBzaW5nbGUgcmVxdWVzdCB0aGF0IHVwZGF0ZXMgZXhpc3RpbmdcbiAgICogc3RhY2sgaW5zdGFuY2VzICphbmQqIGNyZWF0ZXMgbmV3IHN0YWNrIGluc3RhbmNlcy4gQW55IGNvbmZsaWN0aW5nIG9wZXJhdGlvbnMgd2lsbCBiZSBxdWV1ZWRcbiAgICogZm9yIGltbWVkaWF0ZSBwcm9jZXNzaW5nIG9uY2UgdGhlIGNvbmZsaWN0IGlzIHJlc29sdmVkLlxuICAgKlxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICByZWFkb25seSBtYW5hZ2VkRXhlY3V0aW9uPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIG9wZXJhdGlvbiBwcmVmZXJlbmNlcyBmb3IgdGhlIFN0YWNrU2V0LlxuICAgKlxuICAgKiBUaGlzIGFsbG93cyB5b3UgdG8gY29udHJvbCBob3cgdGhlIFN0YWNrU2V0IGlzIGRlcGxveWVkXG4gICAqIGFjcm9zcyB0aGUgdGFyZ2V0IGFjY291bnRzIGFuZCByZWdpb25zLlxuICAgKi9cbiAgcmVhZG9ubHkgb3BlcmF0aW9uUHJlZmVyZW5jZXM/OiBPcGVyYXRpb25QcmVmZXJlbmNlcztcblxuICAvKipcbiAgICogVGhlIGlucHV0IHBhcmFtZXRlcnMgZm9yIHRoZSBzdGFjayBzZXQgdGVtcGxhdGUuXG4gICAqL1xuICByZWFkb25seSBwYXJhbWV0ZXJzPzogU3RhY2tTZXRQYXJhbWV0ZXI7XG5cbiAgLyoqXG4gICAqIFNwZWNpZnkgYSBsaXN0IG9mIGNhcGFiaWxpdGllcyByZXF1aXJlZCBieSB5b3VyIHN0YWNrc2V0LlxuICAgKlxuICAgKiBTdGFja1NldHMgdGhhdCBjb250YWlucyBjZXJ0YWluIGZ1bmN0aW9uYWxpdHkgcmVxdWlyZSBhbiBleHBsaWNpdCBhY2tub3dsZWRnZW1lbnRcbiAgICogdGhhdCB0aGUgc3RhY2sgY29udGFpbnMgdGhlc2UgY2FwYWJpbGl0aWVzLlxuICAgKlxuICAgKiBJZiB5b3UgZGVwbG95IGEgc3RhY2sgdGhhdCByZXF1aXJlcyBjZXJ0YWluIGNhcGFiaWxpdGllcyBhbmQgdGhleSBhcmVcbiAgICogbm90IHNwZWNpZmllZCwgdGhlIGRlcGxveW1lbnQgd2lsbCBmYWlsIHdpdGggYSBgSW5zdWZmaWNpZW50Q2FwYWJpbGl0aWVzYCBlcnJvci5cbiAgICpcbiAgICogQGRlZmF1bHQgLSBubyBzcGVjaWZpYyBjYXBhYmlsaXRpZXNcbiAgICovXG4gIHJlYWRvbmx5IGNhcGFiaWxpdGllcz86IENhcGFiaWxpdHlbXTtcbn1cblxuLyoqXG4gKiBJbmRpY2F0ZXMgd2hldGhlciBhIHNlcnZpY2UgbWFuYWdlZCBzdGFja3NldCBpcyBkZXBsb3llZCBmcm9tIHRoZVxuICogQVdTIE9yZ2FuaXphdGlvbnMgbWFuYWdlbWVudCBhY2NvdW50IG9yIHRoZSBkZWxlZ2F0ZWQgYWRtaW4gYWNjb3VudFxuICovXG5lbnVtIENhbGxBcyB7XG4gIC8qKlxuICAgKiBUaGUgU3RhY2tTZXQgaXMgZGVwbG95ZWQgZnJvbSB0aGUgRGVsZWdhdGVkIEFkbWluIGFjY291bnRcbiAgICpcbiAgICogQHNlZSBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vQVdTQ2xvdWRGb3JtYXRpb24vbGF0ZXN0L1VzZXJHdWlkZS9zdGFja3NldHMtb3Jncy1kZWxlZ2F0ZWQtYWRtaW4uaHRtbFxuICAgKi9cbiAgREVMRUdBVEVEX0FETUlOID0gJ0RFTEVHQVRFRF9BRE1JTicsXG5cbiAgLyoqXG4gICAqIFRoZSBTdGFja1NldCBpcyBkZXBsb3llZCBmcm9tIHRoZSBNYW5hZ2VtZW50IGFjY291bnRcbiAgICovXG4gIFNFTEYgPSAnU0VMRicsXG59XG5cbi8qKlxuICogU3RhY2tTZXRzIHRoYXQgY29udGFpbnMgY2VydGFpbiBmdW5jdGlvbmFsaXR5IHJlcXVpcmUgYW4gZXhwbGljaXQgYWNrbm93bGVkZ2VtZW50XG4gKiB0aGF0IHRoZSBzdGFjayBjb250YWlucyB0aGVzZSBjYXBhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBlbnVtIENhcGFiaWxpdHkge1xuICAvKipcbiAgICogUmVxdWlyZWQgaWYgdGhlIHN0YWNrIGNvbnRhaW5zIElBTSByZXNvdXJjZXMgd2l0aCBjdXN0b20gbmFtZXNcbiAgICovXG4gIE5BTUVEX0lBTSA9ICdDQVBBQklMSVRZX05BTUVEX0lBTScsXG5cbiAgLyoqXG4gICAqIFJlcXVpcmVkIGlmIHRoZSBzdGFjayBjb250YWlucyBJQU0gcmVzb3VyY2VzLiBJZiB0aGUgSUFNIHJlc291cmNlc1xuICAgKiBhbHNvIGhhdmUgY3VzdG9tIG5hbWVzIHRoZW4gc3BlY2lmeSB7QGxpbmsgQ2FwYWJpbGl0eS5OQU1FRF9JQU19IGluc3RlYWQuXG4gICAqL1xuICBJQU0gPSAnQ0FQQUJJTElUWV9JQU0nLFxuXG4gIC8qKlxuICAgKiBSZXF1aXJlZCBpZiB0aGUgc3RhY2sgY29udGFpbnMgbWFjcm9zLiBOb3Qgc3VwcG9ydGVkIGlmIGRlcGxveWluZ1xuICAgKiBhIHNlcnZpY2UgbWFuYWdlZCBzdGFja3NldC5cbiAgICovXG4gIEFVVE9fRVhQQU5EID0gJ0NBUEFCSUxJVFlfQVVUT19FWFBBTkQnLFxufVxuXG4vKipcbiAqIENsb3VkRm9ybWF0aW9uIG9wZXJhdGlvbiBwcmVmZXJlbmNlcy5cbiAqXG4gKiBUaGlzIG1hcHMgdG8gYGF3c19jbG91ZGZvcm1hdGlvbi5DZm5TdGFja1NldC5PcGVyYXRpb25QcmVmZXJlbmNlc1Byb3BlcnR5YC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPcGVyYXRpb25QcmVmZXJlbmNlcyB7XG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIHN0YWNrIGluc3RhbmNlcyB0aGF0IGNhbiBmYWlsIGJlZm9yZSB0aGUgb3BlcmF0aW9uIGlzIGNvbnNpZGVyZWQgZmFpbGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgZmFpbHVyZVRvbGVyYW5jZUNvdW50PzogbnVtYmVyO1xuICAvKipcbiAgICogVGhlIHBlcmNlbnRhZ2Ugb2Ygc3RhY2sgaW5zdGFuY2VzIHRoYXQgY2FuIGZhaWwgYmVmb3JlIHRoZSBvcGVyYXRpb24gaXMgY29uc2lkZXJlZCBmYWlsZWQuXG4gICAqL1xuICByZWFkb25seSBmYWlsdXJlVG9sZXJhbmNlUGVyY2VudGFnZT86IG51bWJlcjtcbiAgLyoqXG4gICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBzdGFjayBpbnN0YW5jZXMgdGhhdCBjYW4gYmUgY3JlYXRlZCBvciB1cGRhdGVkIGNvbmN1cnJlbnRseS5cbiAgICovXG4gIHJlYWRvbmx5IG1heENvbmN1cnJlbnRDb3VudD86IG51bWJlcjtcbiAgLyoqXG4gICAqIFRoZSBtYXhpbXVtIHBlcmNlbnRhZ2Ugb2Ygc3RhY2sgaW5zdGFuY2VzIHRoYXQgY2FuIGJlIGNyZWF0ZWQgb3IgdXBkYXRlZCBjb25jdXJyZW50bHkuXG4gICAqL1xuICByZWFkb25seSBtYXhDb25jdXJyZW50UGVyY2VudGFnZT86IG51bWJlcjtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZGVwbG95IG11bHRpcGxlIHJlZ2lvbnMgc2VxdWVudGlhbGx5IG9yIGluIHBhcmFsbGVsLlxuICAgKlxuICAgKiBAZW51bSB7UmVnaW9uQ29uY3VycmVuY3lUeXBlfVxuICAgKiBAZGVmYXVsdCBSZWdpb25Db25jdXJyZW5jeVR5cGUuU0VRVUVOVElBTFxuICAgKi9cbiAgcmVhZG9ubHkgcmVnaW9uQ29uY3VycmVuY3lUeXBlPzogUmVnaW9uQ29uY3VycmVuY3lUeXBlO1xuICAvKipcbiAgICogVGhlIG9yZGVyIGluIHdoaWNoIHRvIGRlcGxveSB0aGUgc3RhY2sgaW5zdGFuY2VzIHRvIHRoZSByZWdpb25zLlxuICAgKi9cbiAgcmVhZG9ubHkgcmVnaW9uT3JkZXI/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBUaGUgdHlwZSBvZiBjb25jdXJyZW5jeSB0byB1c2Ugd2hlbiBkZXBsb3lpbmcgdGhlIFN0YWNrU2V0IHRvIHJlZ2lvbnMuXG4gKi9cbmV4cG9ydCBlbnVtIFJlZ2lvbkNvbmN1cnJlbmN5VHlwZSB7XG4gIC8qKlxuICAgKiBEZXBsb3kgdGhlIFN0YWNrU2V0IHRvIHJlZ2lvbnMgc2VxdWVudGlhbGx5IGluIHRoZSBvcmRlciBzcGVjaWZpZWQgaW5cbiAgICoge0BsaW5rIFN0YWNrU2V0UHJvcHMub3BlcmF0aW9uUHJlZmVyZW5jZXMucmVnaW9uT3JkZXJ9LlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBkZWZhdWx0IGJlaGF2aW9yLlxuICAgKi9cbiAgU0VRVUVOVElBTCA9ICdTRVFVRU5USUFMJyxcblxuICAvKipcbiAgICogRGVwbG95IHRoZSBTdGFja1NldCB0byBhbGwgcmVnaW9ucyBpbiBwYXJhbGxlbC5cbiAgICovXG4gIFBBUkFMTEVMID0gJ1BBUkFMTEVMJyxcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgQ2xvdWRGb3JtYXRpb24gU3RhY2tTZXRcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJU3RhY2tTZXQgZXh0ZW5kcyBJUmVzb3VyY2Uge1xuICAvKipcbiAgICogT25seSBhdmFpbGFibGUgb24gc2VsZiBtYW5hZ2VkIHN0YWNrc2V0cy5cbiAgICpcbiAgICogVGhlIGFkbWluIHJvbGUgdGhhdCBDbG91ZEZvcm1hdGlvbiB3aWxsIHVzZSB0byBwZXJmb3JtIHN0YWNrc2V0IG9wZXJhdGlvbnMuXG4gICAqIFRoaXMgcm9sZSBzaG91bGQgb25seSBoYXZlIHBlcm1pc3Npb25zIHRvIGJlIGFzc3VtZWQgYnkgdGhlIENsb3VkRm9ybWF0aW9uIHNlcnZpY2VcbiAgICogYW5kIHRvIGFzc3VtZSB0aGUgZXhlY3V0aW9uIHJvbGUgaW4gZWFjaCBpbmRpdmlkdWFsIGFjY291bnQuXG4gICAqXG4gICAqIFdoZW4geW91IGNyZWF0ZSB0aGUgZXhlY3V0aW9uIHJvbGUgaXQgbXVzdCBoYXZlIGFuIGFzc3VtZSByb2xlIHBvbGljeSBzdGF0ZW1lbnQgd2hpY2hcbiAgICogYWxsb3dzIGBzdHM6QXNzdW1lUm9sZWAgZnJvbSB0aGlzIGFkbWluIHJvbGUuXG4gICAqXG4gICAqIFRvIGdyYW50IHNwZWNpZmljIHVzZXJzL2dyb3VwcyBhY2Nlc3MgdG8gdXNlIHRoaXMgcm9sZSB0byBkZXBsb3kgc3RhY2tzZXRzIHRoZXkgbXVzdCBoYXZlXG4gICAqIGEgcG9saWN5IHRoYXQgYWxsb3dzIGBpYW06R2V0Um9sZWAgJiBgaWFtOlBhc3NSb2xlYCBvbiB0aGlzIHJvbGUgcmVzb3VyY2UuXG4gICAqL1xuICByZWFkb25seSByb2xlPzogaWFtLklSb2xlO1xufVxuXG4vKipcbiAqIEFXUyBSZWdpb25zIGludHJvZHVjZWQgYWZ0ZXIgTWFyY2ggMjAsIDIwMTksIHN1Y2ggYXMgQXNpYSBQYWNpZmljIChIb25nIEtvbmcpLCBhcmUgZGlzYWJsZWQgYnkgZGVmYXVsdC5cbiAqIEJlIGF3YXJlIHRoYXQgdG8gZGVwbG95IHN0YWNrIGluc3RhbmNlcyBpbnRvIGEgdGFyZ2V0IGFjY291bnQgdGhhdCByZXNpZGVzIGluIGEgUmVnaW9uIHRoYXQncyBkaXNhYmxlZCBieSBkZWZhdWx0LFxuICogeW91IHdpbGwgYWxzbyBuZWVkIHRvIGluY2x1ZGUgdGhlIHJlZ2lvbmFsIHNlcnZpY2UgcHJpbmNpcGFsIGZvciB0aGF0IFJlZ2lvbi5cbiAqIEVhY2ggUmVnaW9uIHRoYXQncyBkaXNhYmxlZCBieSBkZWZhdWx0IHdpbGwgaGF2ZSBpdHMgb3duIHJlZ2lvbmFsIHNlcnZpY2UgcHJpbmNpcGFsLlxuICovXG5jb25zdCBFTkFCTEVEX1JFR0lPTlMgPSBbXG4gICd1cy1lYXN0LTEnLCAvLyBVUyBFYXN0IChOLiBWaXJnaW5pYSlcbiAgJ2V1LXdlc3QtMScsIC8vIEV1cm9wZSAoSXJlbGFuZClcbiAgJ3VzLXdlc3QtMScsIC8vIFVTIFdlc3QgKE4uIENhbGlmb3JuaWEpXG4gICdhcC1zb3V0aGVhc3QtMScsIC8vIEFzaWEgUGFjaWZpYyAoU2luZ2Fwb3JlKVxuICAnYXAtbm9ydGhlYXN0LTEnLCAvLyBBc2lhIFBhY2lmaWMgKFRva3lvKVxuICAndXMtZ292LXdlc3QtMScsIC8vIEFXUyBHb3ZDbG91ZCAoVVMtV2VzdClcbiAgJ3VzLXdlc3QtMicsIC8vIFVTIFdlc3QgKE9yZWdvbilcbiAgJ3NhLWVhc3QtMScsIC8vIFNvdXRoIEFtZXJpY2EgKFPDo28gUGF1bG8pXG4gICdhcC1zb3V0aGVhc3QtMicsIC8vIEFzaWEgUGFjaWZpYyAoU3lkbmV5KVxuICAnY24tbm9ydGgtMScsIC8vIENoaW5hIChCZWlqaW5nKVxuICAnZXUtY2VudHJhbC0xJywgLy8gRXVyb3BlIChGcmFua2Z1cnQpXG4gICdhcC1ub3J0aGVhc3QtMicsIC8vIEFzaWEgUGFjaWZpYyAoU2VvdWwpXG4gICdhcC1zb3V0aC0xJywgLy8gQXNpYSBQYWNpZmljIChNdW1iYWkpXG4gICd1cy1lYXN0LTInLCAvLyBVUyBFYXN0IChPaGlvKVxuICAnY2EtY2VudHJhbC0xJywgLy8gQ2FuYWRhIChDZW50cmFsKVxuICAnZXUtd2VzdC0yJywgLy8gRXVyb3BlIChMb25kb24pXG4gICdjbi1ub3J0aHdlc3QtMScsIC8vIENoaW5hIChOaW5neGlhKVxuICAnZXUtd2VzdC0zJywgLy8gRXVyb3BlIChQYXJpcylcbiAgJ2FwLW5vcnRoZWFzdC0zJywgLy8gQXNpYSBQYWNpZmljIChPc2FrYSlcbiAgJ3VzLWdvdi1lYXN0LTEnLCAvLyBBV1MgR292Q2xvdWQgKFVTLUVhc3QpXG4gICdldS1ub3J0aC0xJywgLy8gRXVyb3BlIChTdG9ja2hvbG0pXG4gICdldS1zb3V0aC0yJywgLy8gRXVyb3BlIChTcGFpbilcbl07XG5cbi8vIGRpc2FibGVkIHJlZ2lvbnNcbi8vICdhZi1zb3V0aC0xJywgLy8gQWZyaWNhIChDYXBlIFRvd24pXG4vLyAnYXAtc291dGhlYXN0LTMnLCAvLyBBc2lhIFBhY2lmaWMgKEpha2FydGEpXG4vLyAnYXAtZWFzdC0xJywgLy8gQXNpYSBQYWNpZmljIChIb25nIEtvbmcpXG4vLyAnZXUtc291dGgtMScsIC8vIEV1cm9wZSAoTWlsYW4pXG4vLyAnbWUtc291dGgtMScsIC8vIE1pZGRsZSBFYXN0IChCYWhyYWluKVxuXG5leHBvcnQgY2xhc3MgU3RhY2tTZXQgZXh0ZW5kcyBSZXNvdXJjZSBpbXBsZW1lbnRzIElTdGFja1NldCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhY2tJbnN0YW5jZXM6IGNmbi5DZm5TdGFja1NldC5TdGFja0luc3RhbmNlc1Byb3BlcnR5W10gPSBbXTtcblxuICBwcml2YXRlIHJlYWRvbmx5IF9yb2xlPzogaWFtLklSb2xlO1xuICBwcml2YXRlIHJlYWRvbmx5IHBlcm1pc3Npb25Nb2RlbDogUGVybWlzc2lvbk1vZGVsO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IFN0YWNrU2V0LlxuICAgKlxuICAgKiBAcGFyYW0gc2NvcGUgVGhlIHNjb3BlIGluIHdoaWNoIHRvIGRlZmluZSB0aGlzIFN0YWNrU2V0LlxuICAgKiBAcGFyYW0gaWQgVGhlIElEIG9mIHRoZSBTdGFja1NldC5cbiAgICogQHBhcmFtIHByb3BzIFRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBTdGFja1NldC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTdGFja1NldFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCB7XG4gICAgICBwaHlzaWNhbE5hbWU6IHByb3BzLnN0YWNrU2V0TmFtZSA/PyBMYXp5LnN0cmluZyh7IHByb2R1Y2U6ICgpID0+IE5hbWVzLnVuaXF1ZVJlc291cmNlTmFtZSh0aGlzLCB7fSkgfSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBkZXBsb3ltZW50VHlwZUNvbmZpZyA9IChwcm9wcy5kZXBsb3ltZW50VHlwZSA/PyBEZXBsb3ltZW50VHlwZS5zZWxmTWFuYWdlZCgpKS5fYmluZCh0aGlzKTtcbiAgICBpZiAoZGVwbG95bWVudFR5cGVDb25maWcucGVybWlzc2lvbnNNb2RlbCA9PT0gUGVybWlzc2lvbk1vZGVsLlNFTEZfTUFOQUdFRCkge1xuICAgICAgdGhpcy5fcm9sZSA9IGRlcGxveW1lbnRUeXBlQ29uZmlnLmFkbWluUm9sZSA/PyBuZXcgaWFtLlJvbGUoc2NvcGUsICdBZG1pblJvbGUnLCB7XG4gICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdjbG91ZGZvcm1hdGlvbi5hbWF6b25hd3MuY29tJyksXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fcm9sZS5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogWydzdHM6QXNzdW1lUm9sZSddLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBTdGFjay5vZih0aGlzKS5mb3JtYXRBcm4oe1xuICAgICAgICAgICAgc2VydmljZTogJ2lhbScsXG4gICAgICAgICAgICByZWdpb246ICcnLFxuICAgICAgICAgICAgYWNjb3VudDogJyonLFxuICAgICAgICAgICAgcmVzb3VyY2U6ICdyb2xlJyxcbiAgICAgICAgICAgIHJlc291cmNlTmFtZTogZGVwbG95bWVudFR5cGVDb25maWcuZXhlY3V0aW9uUm9sZU5hbWUgPz8gJ0FXU0Nsb3VkRm9ybWF0aW9uU3RhY2tTZXRFeGVjdXRpb25Sb2xlJyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBpZiAocHJvcHMuY2FwYWJpbGl0aWVzPy5pbmNsdWRlcyhDYXBhYmlsaXR5LkFVVE9fRVhQQU5EKSAmJiBkZXBsb3ltZW50VHlwZUNvbmZpZy5wZXJtaXNzaW9uc01vZGVsID09PSBQZXJtaXNzaW9uTW9kZWwuU0VSVklDRV9NQU5BR0VEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NlcnZpY2UgbWFuYWdlZCBzdGFja3NldHMgZG8gbm90IGN1cnJlbnQgc3VwcG9ydCB0aGUgXCJBVVRPX0VYUEFORFwiIGNhcGFiaWxpdHknKTtcbiAgICB9XG5cbiAgICB0aGlzLnBlcm1pc3Npb25Nb2RlbCA9IGRlcGxveW1lbnRUeXBlQ29uZmlnLnBlcm1pc3Npb25zTW9kZWw7XG5cbiAgICB0aGlzLmFkZFRhcmdldChwcm9wcy50YXJnZXQpO1xuICAgIGNvbnN0IHN0YWNrU2V0ID0gbmV3IGNmbi5DZm5TdGFja1NldCh0aGlzLCAnUmVzb3VyY2UnLCB7XG4gICAgICBhdXRvRGVwbG95bWVudDogdW5kZWZpbmVkSWZOb0tleXMoe1xuICAgICAgICBlbmFibGVkOiBkZXBsb3ltZW50VHlwZUNvbmZpZy5hdXRvRGVwbG95RW5hYmxlZCxcbiAgICAgICAgcmV0YWluU3RhY2tzT25BY2NvdW50UmVtb3ZhbDogZGVwbG95bWVudFR5cGVDb25maWcuYXV0b0RlcGxveVJldGFpblN0YWNrcyxcbiAgICAgIH0pLFxuICAgICAgZXhlY3V0aW9uUm9sZU5hbWU6IGRlcGxveW1lbnRUeXBlQ29uZmlnLmV4ZWN1dGlvblJvbGVOYW1lLFxuICAgICAgYWRtaW5pc3RyYXRpb25Sb2xlQXJuOiB0aGlzLl9yb2xlPy5yb2xlQXJuLFxuICAgICAgZGVzY3JpcHRpb246IHByb3BzLmRlc2NyaXB0aW9uLFxuICAgICAgbWFuYWdlZEV4ZWN1dGlvbjoge1xuICAgICAgICBBY3RpdmU6IHByb3BzLm1hbmFnZWRFeGVjdXRpb24gPz8gdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBvcGVyYXRpb25QcmVmZXJlbmNlczogcHJvcHMub3BlcmF0aW9uUHJlZmVyZW5jZXMgPyB1bmRlZmluZWRJZk5vS2V5cyhwcm9wcy5vcGVyYXRpb25QcmVmZXJlbmNlcykgOiB1bmRlZmluZWQsXG4gICAgICBzdGFja1NldE5hbWU6IHRoaXMucGh5c2ljYWxOYW1lLFxuICAgICAgY2FwYWJpbGl0aWVzOiBwcm9wcy5jYXBhYmlsaXRpZXMsXG4gICAgICBwZXJtaXNzaW9uTW9kZWw6IGRlcGxveW1lbnRUeXBlQ29uZmlnLnBlcm1pc3Npb25zTW9kZWwsXG4gICAgICBjYWxsQXM6IGRlcGxveW1lbnRUeXBlQ29uZmlnLmNhbGxBcyxcbiAgICAgIHRlbXBsYXRlVXJsOiBwcm9wcy50ZW1wbGF0ZS50ZW1wbGF0ZVVybCxcbiAgICAgIHN0YWNrSW5zdGFuY2VzR3JvdXA6IExhenkuYW55KHtcbiAgICAgICAgcHJvZHVjZTogKCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLnN0YWNrSW5zdGFuY2VzO1xuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICAuLi4ocHJvcHMucGFyYW1ldGVycyA/IHtcbiAgICAgICAgcGFyYW1ldGVyczogT2JqZWN0LmVudHJpZXMocHJvcHMucGFyYW1ldGVycykubWFwKChlbnRyeSkgPT4ge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXJhbWV0ZXJLZXk6IGVudHJ5WzBdLFxuICAgICAgICAgICAgcGFyYW1ldGVyVmFsdWU6IGVudHJ5WzFdLFxuICAgICAgICAgIH07XG4gICAgICAgIH0pLFxuICAgICAgfSA6IHt9KSxcbiAgICB9KTtcblxuICAgIC8vIHRoZSBmaWxlIGFzc2V0IGJ1Y2tldCBkZXBsb3ltZW50IG5lZWRzIHRvIGNvbXBsZXRlIGJlZm9yZSB0aGUgc3RhY2tzZXQgY2FuIGRlcGxveVxuICAgIGZvciAoY29uc3QgZmlsZUFzc2V0UmVzb3VyY2VOYW1lIG9mIGZpbGVBc3NldFJlc291cmNlTmFtZXMpIHtcbiAgICAgIGNvbnN0IGZpbGVBc3NldFJlc291cmNlID0gc2NvcGUubm9kZS50cnlGaW5kQ2hpbGQoZmlsZUFzc2V0UmVzb3VyY2VOYW1lKTtcbiAgICAgIGZpbGVBc3NldFJlc291cmNlICYmIHN0YWNrU2V0Lm5vZGUuYWRkRGVwZW5kZW5jeShmaWxlQXNzZXRSZXNvdXJjZSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGdldCByb2xlKCk6IGlhbS5JUm9sZSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLl9yb2xlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NlcnZpY2UgbWFuYWdlZCBTdGFja1NldHMgZG8gbm90IGhhdmUgYW4gYXNzb2NpYXRlZCByb2xlJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yb2xlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSB0YXJnZXQgdG8gdGhlIFN0YWNrU2V0LlxuICAgKlxuICAgKiBAcGFyYW0gdGFyZ2V0IHRoZSB0YXJnZXQgdG8gYWRkIHRvIHRoZSBTdGFja1NldFxuICAgKi9cbiAgcHVibGljIGFkZFRhcmdldCh0YXJnZXQ6IFN0YWNrU2V0VGFyZ2V0KSB7XG4gICAgY29uc3QgdGFyZ2V0Q29uZmlnID0gdGFyZ2V0Ll9iaW5kKHRoaXMpO1xuXG4gICAgaWYgKHRoaXMuX3JvbGUgJiYgdGhpcy5fcm9sZSBpbnN0YW5jZW9mIGlhbS5Sb2xlKSB7XG4gICAgICBjb25zdCBkaXNhYmxlZFByaW5jaXBhbHM6IGlhbS5JUHJpbmNpcGFsW10gPSBbXTtcbiAgICAgIHRhcmdldENvbmZpZy5yZWdpb25zLmZvckVhY2gocmVnaW9uID0+IHtcbiAgICAgICAgaWYgKCFFTkFCTEVEX1JFR0lPTlMuaW5jbHVkZXMocmVnaW9uKSkge1xuICAgICAgICAgIGRpc2FibGVkUHJpbmNpcGFscy5wdXNoKG5ldyBpYW0uU2VydmljZVByaW5jaXBhbChgY2xvdWRmb3JtYXRpb24uJHtyZWdpb259LiR7U3RhY2sub2YodGhpcykudXJsU3VmZml4fWApKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoZGlzYWJsZWRQcmluY2lwYWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fcm9sZS5hc3N1bWVSb2xlUG9saWN5Py5hZGRTdGF0ZW1lbnRzKG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogWydzdHM6QXNzdW1lUm9sZSddLFxuICAgICAgICAgIHByaW5jaXBhbHM6IGRpc2FibGVkUHJpbmNpcGFscyxcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN0YWNrSW5zdGFuY2VzLnB1c2goe1xuICAgICAgcmVnaW9uczogdGFyZ2V0Q29uZmlnLnJlZ2lvbnMsXG4gICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHRhcmdldENvbmZpZy5wYXJhbWV0ZXJPdmVycmlkZXMsXG4gICAgICBkZXBsb3ltZW50VGFyZ2V0czoge1xuICAgICAgICBhY2NvdW50czogdGFyZ2V0Q29uZmlnLmFjY291bnRzLFxuICAgICAgICBhY2NvdW50RmlsdGVyVHlwZTogdGhpcy5wZXJtaXNzaW9uTW9kZWwgPT09IFBlcm1pc3Npb25Nb2RlbC5TRVJWSUNFX01BTkFHRURcbiAgICAgICAgICA/IHRhcmdldENvbmZpZy5hY2NvdW50RmlsdGVyVHlwZVxuICAgICAgICAgIDogdW5kZWZpbmVkLCAvLyBmaWVsZCBub3Qgc3VwcG9ydGVkIGZvciBzZWxmIG1hbmFnZWRcbiAgICAgICAgb3JnYW5pemF0aW9uYWxVbml0SWRzOiB0YXJnZXRDb25maWcub3JnYW5pemF0aW9uYWxVbml0cyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdW5kZWZpbmVkSWZOb0tleXM8QSBleHRlbmRzIE9iamVjdD4ob2JqOiBBKTogQSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGFsbFVuZGVmaW5lZCA9IE9iamVjdC52YWx1ZXMob2JqKS5ldmVyeSh2YWwgPT4gdmFsID09PSB1bmRlZmluZWQpO1xuICByZXR1cm4gYWxsVW5kZWZpbmVkID8gdW5kZWZpbmVkIDogb2JqO1xufVxuIl19