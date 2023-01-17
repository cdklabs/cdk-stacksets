import {
  aws_cloudformation as cfn,
  aws_iam as iam,
  IResource,
  Lazy,
  Names,
  Resource,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StackSetStack } from './stackset-stack';

/**
 * Represents a StackSet CloudFormation template
 */
export abstract class StackSetTemplate {
  /**
   * @param stack the stack to use as the base for the stackset template
   * @returns StackSetTemplate
   */
  public static fromStackSetStack(stack: StackSetStack): StackSetTemplate {
    return { templateUrl: stack._getTemplateUrl() };
  }

  /**
   * The S3 URL of the StackSet template
   */
  public abstract readonly templateUrl: string;
}

/**
 * The type of StackSet account filter
 */
enum AccountFilterType {
  /**
   * _Only_ deploys to specified accounts
   */
  INTERSECTION = 'INTERSECTION',

  /**
   * _Does not_ deploy to the specified accounts
   */
  DIFFERENCE = 'DIFFERENCE',

  /**
   * (default value) include both OUs and Accounts
   * Allows you to deploy to an OU _and_ specific accounts in a different OU
   */
  UNION = 'UNION',

  /**
   * Only deploy to accounts in an OU
   */
  NONE = 'NONE',
}

/**
 * CloudFormation stack parameters
 */
export type StackSetParameter = { [key: string]: string };

/**
 * Common options for deploying a StackSet to a target
 */
export interface TargetOptions {
  /**
   * A list of regions the Stack should be deployed to.
   *
   * If {@link StackSetProps.operationPreferences.regionOrder} is specified
   * then the StackSet will be deployed sequentially otherwise it will be
   * deployed to all regions in parallel.
   */
  readonly regions: string[];

  /**
   * Parameter overrides that should be applied to only this target
   *
   * @default - use parameter overrides specified in {@link StackSetProps.parameterOverrides}
   */
  readonly parameterOverrides?: StackSetParameter;
}

/**
 * Options for deploying a StackSet to a set of Organizational Units (OUs)
 */
export interface OrganizationsTargetOptions extends TargetOptions {
  /**
   * A list of organizational unit ids to deploy to. The StackSet will
   * deploy the provided Stack template to all accounts in the OU.
   * This can be further filtered by specifying either `additionalAccounts`
   * or `excludeAccounts`.
   *
   * If the `deploymentType` is specified with `autoDeployEnabled` then
   * the StackSet will automatically deploy the Stack to new accounts as they
   * are added to the specified `organizationalUnits`
   */
  readonly organizationalUnits: string[];

  /**
   * A list of additional AWS accounts to deploy the StackSet to. This can be
   * used to deploy the StackSet to additional AWS accounts that exist in a
   * different OU than what has been provided in `organizationalUnits`
   *
   * @default - Stacks will only be deployed to accounts that exist in the
   * specified organizationalUnits
   */
  readonly additionalAccounts?: string[];

  /**
   * A list of AWS accounts to exclude from deploying the StackSet to. This can
   * be useful if there are accounts that exist in an OU that is provided in
   * `organizationalUnits`, but you do not want the StackSet to be deployed.
   *
   * @default - Stacks will be deployed to all accounts that exist in the OUs
   * specified in the organizationUnits property
   */
  readonly excludeAccounts?: string[];
}

/**
 * Options for deploying a StackSet to a list of AWS accounts
 */
export interface AccountsTargetOptions extends TargetOptions {
  /**
   * A list of AWS accounts to deploy the StackSet to
   */
  readonly accounts: string[];
}

interface Parameter {
  readonly parameterKey: string;
  readonly parameterValue: string;
}

interface StackSetTargetConfig {
  readonly accountFilterType: AccountFilterType;
  readonly regions: string[];
  readonly parameterOverrides?: Parameter[];
  readonly accounts?: string[];
  readonly organizationalUnits?: string[];
}

interface TargetBindOptions {}

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
export abstract class StackSetTarget {
  /**
   * Deploy the StackSet to a list of accounts
   *
   * @example
   * StackSetTarget.fromAccounts({
   *   accounts: ['11111111111', '22222222222'],
   *   regions: ['us-east-1', 'us-east-2'],
   * });
   */
  public static fromAccounts(options: AccountsTargetOptions): StackSetTarget {
    return new AccountsTarget(options);
  };

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
  public static fromOrganizationalUnits(options: OrganizationsTargetOptions): StackSetTarget {
    return new OrganizationsTarget(options);
  }

  /**
   * @internal
   */
  protected _renderParameters(parameters?: StackSetParameter): Parameter[] | undefined {
    if (!parameters) return undefined;
    const overrides: Parameter[] = [];
    for (const [key, value] of Object.entries(parameters ?? {})) {
      overrides.push({
        parameterKey: key,
        parameterValue: value,
      });
    }
    return overrides;
  }

  /**
   * Render the configuration for a StackSet target
   *
   * @internal
   */
  public abstract _bind(scope: Construct, options?: TargetBindOptions): StackSetTargetConfig;
}

class AccountsTarget extends StackSetTarget {
  constructor(private readonly options: AccountsTargetOptions) {
    super();
  }

  public _bind(_scope: Construct, _options: TargetBindOptions = {}): StackSetTargetConfig {
    return {
      regions: this.options.regions,
      parameterOverrides: this._renderParameters(this.options.parameterOverrides),
      accountFilterType: AccountFilterType.INTERSECTION,
      accounts: this.options.accounts,
    };
  }
}

class OrganizationsTarget extends StackSetTarget {
  constructor(private readonly options: OrganizationsTargetOptions) {
    super();
  }

  public _bind(_scope: Construct, _options: TargetBindOptions = {}): StackSetTargetConfig {
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

/**
 * Options for StackSets that are managed by AWS Organizations.
 */
export interface ServiceManagedOptions {
  /**
   * Whether or not the StackSet should automatically create/remove the Stack
   * from AWS accounts that are added/removed from an organizational unit.
   *
   * This has no effect if {@link StackSetTarget.fromAccounts} is used
   *
   * @default true
   */
  readonly autoDeployEnabled?: boolean;

  /**
   * Whether stacks should be removed from AWS accounts that are removed
   * from an organizational unit.
   *
   * By default the stack will be retained (not deleted)
   *
   * This has no effect if {@link StackSetTarget.fromAccounts} is used
   *
   * @default true
   */
  readonly autoDeployRetainStacks?: boolean;

  /**
   * Whether or not the account this StackSet is deployed from is the delegated admin account.
   *
   * Set this to `false` if you are using the AWS Organizations management account instead.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-delegated-admin.html
   *
   * @default true
   */
  readonly delegatedAdmin?: boolean;
}

/**
 * Options for StackSets that are not managed by AWS Organizations.
 */
export interface SelfManagedOptions {
  /**
   * The name of the stackset execution role that already exists in each target AWS account.
   * This role must be configured with a trust policy that allows `sts:AssumeRole` from the `adminRole`.
   *
   * In addition this role must have the necessary permissions to manage the resources created by the stackset.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-prereqs-self-managed.html#stacksets-prereqs-accountsetup
   *
   * @default - AWSCloudFormationStackSetExecutionRole
   */
  readonly executionRoleName?: string;

  /**
   * The admin role that CloudFormation will use to perform stackset operations.
   * This role should only have permissions to be assumed by the CloudFormation service
   * and to assume the execution role in each individual account.
   *
   * When you create the execution role it must have an assume role policy statement which
   * allows `sts:AssumeRole` from this admin role.
   *
   * To grant specific users/groups access to use this role to deploy stacksets they must have
   * a policy that allows `iam:GetRole` & `iam:PassRole` on this role resource.
   *
   * @default - a default role will be created
   */
  readonly adminRole?: iam.IRole;
}

enum PermissionModel {
  SERVICE_MANAGED = 'SERVICE_MANAGED',
  SELF_MANAGED = 'SELF_MANAGED',
}

interface DeploymentTypeConfig {
  readonly permissionsModel: PermissionModel;
  readonly executionRoleName?: string;
  readonly adminRole?: iam.IRole;
  readonly autoDeployEnabled?: boolean;
  readonly autoDeployRetainStacks?: boolean;
  readonly callAs?: CallAs;
}

interface DeploymentTypeOptions {}

export abstract class DeploymentType {
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
  public static serviceManaged(options: ServiceManagedOptions = {}): DeploymentType {
    return new ManagedDeploymentType(options);
  }

  /**
   * StackSets deployed using the self managed model require you to create the necessary
   * IAM roles in the source and target AWS accounts and to setup the required IAM permissions.
   *
   * Using this model you can only deploy to AWS accounts that have the necessary IAM roles/permissions
   * pre-created.
   */
  public static selfManaged(options: SelfManagedOptions = {}): DeploymentType {
    return new SelfDeploymentType(options);
  }

  /**
   * Render the deployment type config
   *
   * @internal
   */
  public abstract _bind(scope: Construct, options?: DeploymentTypeOptions): DeploymentTypeConfig;
}

class ManagedDeploymentType extends DeploymentType {
  constructor(private readonly options?: ServiceManagedOptions) {
    super();
  }

  public _bind(_scope: Construct, _options: DeploymentTypeOptions = {}): DeploymentTypeConfig {
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
  constructor(private readonly options?: SelfManagedOptions) {
    super();
  }

  public _bind(_scope: Construct, _options: DeploymentTypeOptions = {}): DeploymentTypeConfig {
    return {
      permissionsModel: PermissionModel.SELF_MANAGED,
      adminRole: this.options?.adminRole,
      executionRoleName: this.options?.executionRoleName,
    };
  }
}

export interface StackSetProps {
  /**
   * Which accounts/OUs and regions to deploy the StackSet to
   */
  readonly target: StackSetTarget;

  /**
   * The Stack that will be deployed to the target
   */
  readonly template: StackSetTemplate;

  /**
   * The name of the stack set
   *
   * @default - CloudFormation generated name
   */
  readonly stackSetName?: string;

  /**
   * An optional description to add to the StackSet
   *
   * @default - no description
   */
  readonly description?: string;

  /**
   * The type of deployment for this StackSet. The deployment can either be managed by
   * AWS Organizations (i.e. DeploymentType.serviceManaged()) or by the AWS account that
   * the StackSet is deployed from.
   *
   * In order to use DeploymentType.serviceManaged() the account needs to either be the
   * organizations's management account or a delegated administrator account.
   *
   * @default DeploymentType.self()
   */
  readonly deploymentType?: DeploymentType;

  /**
   * If this is `true` then StackSets will perform non-conflicting operations concurrently
   * and queue any conflicting operations.
   *
   * This means that you can submit more than one operation per StackSet and they will be
   * executed concurrently. For example you can submit a single request that updates existing
   * stack instances *and* creates new stack instances. Any conflicting operations will be queued
   * for immediate processing once the conflict is resolved.
   *
   * @default true
   */
  readonly managedExecution?: boolean;


  /**
   *
   */
  readonly operationPreferences?: OperationPreferences;

  /**
   * Specify a list of capabilities required by your stackset.
   *
   * StackSets that contains certain functionality require an explicit acknowledgement
   * that the stack contains these capabilities.
   *
   * If you deploy a stack that requires certain capabilities and they are
   * not specified, the deployment will fail with a `InsufficientCapabilities` error.
   *
   * @default - no specific capabilities
   */
  readonly capabilities?: Capability[];
}

/**
 * Indicates whether a service managed stackset is deployed from the
 * AWS Organizations management account or the delegated admin account
 */
enum CallAs {
  /**
   * The StackSet is deployed from the Delegated Admin account
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-delegated-admin.html
   */
  DELEGATED_ADMIN = 'DELEGATED_ADMIN',

  /**
   * The StackSet is deployed from the Management account
   */
  SELF = 'SELF',
}

/**
 * StackSets that contains certain functionality require an explicit acknowledgement
 * that the stack contains these capabilities.
 */
export enum Capability {
  /**
   * Required if the stack contains IAM resources with custom names
   */
  NAMED_IAM = 'CAPABILITY_NAMED_IAM',

  /**
   * Required if the stack contains IAM resources. If the IAM resources
   * also have custom names then specify {@link Capability.NAMED_IAM} instead.
   */
  IAM = 'CAPABILITY_IAM',

  /**
   * Required if the stack contains macros. Not supported if deploying
   * a service managed stackset.
   */
  AUTO_EXPAND = 'CAPABILITY_AUTO_EXPAND',
}

export interface OperationPreferences {
  readonly failureToleranceCount?: number;
  readonly failureTolerancePercentage?: number;
  readonly maxConcurrentCount?: number;
  readonly maxConcurrentPercentage?: number;
  readonly regionConcurrencyType?: RegionConcurrencyType;
  readonly regionOrder?: string[];
}

export enum RegionConcurrencyType {
  SEQUENTIAL = 'SEQUENCIAL',
  PARALLEL = 'PARALLEL',
}

/**
 * Represents a CloudFormation StackSet
 */
export interface IStackSet extends IResource {
  /**
   * Only available on self managed stacksets.
   *
   * The admin role that CloudFormation will use to perform stackset operations.
   * This role should only have permissions to be assumed by the CloudFormation service
   * and to assume the execution role in each individual account.
   *
   * When you create the execution role it must have an assume role policy statement which
   * allows `sts:AssumeRole` from this admin role.
   *
   * To grant specific users/groups access to use this role to deploy stacksets they must have
   * a policy that allows `iam:GetRole` & `iam:PassRole` on this role resource.
   */
  readonly role?: iam.IRole;
}

/**
 * AWS Regions introduced after March 20, 2019, such as Asia Pacific (Hong Kong), are disabled by default.
 * Be aware that to deploy stack instances into a target account that resides in a Region that's disabled by default,
 * you will also need to include the regional service principal for that Region.
 * Each Region that's disabled by default will have its own regional service principal.
 */
const ENABLED_REGIONS = [
  'us-east-1', // US East (N. Virginia)
  'eu-west-1', // Europe (Ireland)
  'us-west-1', // US West (N. California)
  'ap-southeast-1', // Asia Pacific (Singapore)
  'ap-northeast-1', // Asia Pacific (Tokyo)
  'us-gov-west-1', // AWS GovCloud (US-West)
  'us-west-2', // US West (Oregon)
  'sa-east-1', // South America (São Paulo)
  'ap-southeast-2', // Asia Pacific (Sydney)
  'cn-north-1', // China (Beijing)
  'eu-central-1', // Europe (Frankfurt)
  'ap-northeast-2', // Asia Pacific (Seoul)
  'ap-south-1', // Asia Pacific (Mumbai)
  'us-east-2', // US East (Ohio)
  'ca-central-1', // Canada (Central)
  'eu-west-2', // Europe (London)
  'cn-northwest-1', // China (Ningxia)
  'eu-west-3', // Europe (Paris)
  'ap-northeast-3', // Asia Pacific (Osaka)
  'us-gov-east-1', // AWS GovCloud (US-East)
  'eu-north-1', // Europe (Stockholm)
  'eu-south-2', // Europe (Spain)
];

// disabled regions
// 'af-south-1', // Africa (Cape Town)
// 'ap-southeast-3', // Asia Pacific (Jakarta)
// 'ap-east-1', // Asia Pacific (Hong Kong)
// 'eu-south-1', // Europe (Milan)
// 'me-south-1', // Middle East (Bahrain)

export class StackSet extends Resource implements IStackSet {
  private readonly stackInstances: cfn.CfnStackSet.StackInstancesProperty[] = [];

  private readonly _role?: iam.IRole;
  private readonly permissionModel: PermissionModel;
  constructor(scope: Construct, id: string, props: StackSetProps) {
    super(scope, id, {
      physicalName: props.stackSetName ?? Lazy.string({ produce: () => Names.uniqueResourceName(this, {}) }),
    });

    const deploymentTypeConfig = (props.deploymentType ?? DeploymentType.selfManaged())._bind(this);
    if (deploymentTypeConfig.permissionsModel === PermissionModel.SELF_MANAGED) {
      this._role = deploymentTypeConfig.adminRole ?? new iam.Role(scope, 'AdminRole', {
        assumedBy: new iam.ServicePrincipal('cloudformation'),
      });

      this._role.addToPrincipalPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:aws:iam::*:role/${deploymentTypeConfig.executionRoleName ?? 'AWSCloudFormationStackSetExecutionRole'}`,
        ],
      }));
    }

    if (props.capabilities?.includes(Capability.AUTO_EXPAND) && deploymentTypeConfig.permissionsModel === PermissionModel.SERVICE_MANAGED) {
      throw new Error('service managed stacksets do not current support the "AUTO_EXPAND" capability');
    }

    this.permissionModel = deploymentTypeConfig.permissionsModel;

    this.addTarget(props.target);
    new cfn.CfnStackSet(this, 'Resource', {
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
      operationPreferences: undefinedIfNoKeys({
        regionConcurrencyType: props.operationPreferences?.regionConcurrencyType,
        maxConcurrentPercentage: props.operationPreferences?.maxConcurrentPercentage,
        failureTolerancePercentage: props.operationPreferences?.failureTolerancePercentage,
      }),
      stackSetName: this.physicalName,
      capabilities: props.capabilities,
      permissionModel: deploymentTypeConfig.permissionsModel,
      callAs: deploymentTypeConfig.callAs,
      templateUrl: props.template.templateUrl,
      stackInstancesGroup: Lazy.any({ produce: () => { return this.stackInstances; } }),
    });
  }

  public get role(): iam.IRole | undefined {
    if (!this._role) {
      throw new Error('service managed StackSets do not have an associated role');
    }
    return this._role;
  }

  public addTarget(target: StackSetTarget) {
    const targetConfig = target._bind(this);

    if (this._role && this._role instanceof iam.Role) {
      const disabledPrincipals: iam.IPrincipal[] = [];
      targetConfig.regions.forEach(region => {
        if (!ENABLED_REGIONS.includes(region)) {
          disabledPrincipals.push(new iam.ServicePrincipal(`cloudformation.${region}.amazonaws.com`));
        }
      });
      if (disabledPrincipals.length > 0) {
        this._role.assumeRolePolicy?.addStatements(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
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
          : undefined, // field not supported for self managed
        organizationalUnitIds: targetConfig.organizationalUnits,
      },
    });
  }
}

function undefinedIfNoKeys<A extends Object>(obj: A): A | undefined {
  const allUndefined = Object.values(obj).every(val => val === undefined);
  return allUndefined ? undefined : obj;
}
