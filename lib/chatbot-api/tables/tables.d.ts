import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
export declare class TableStack extends Stack {
    readonly historyTable: Table;
    readonly feedbackTable: Table;
    readonly evalResultsTable: Table;
    readonly evalSummaryTable: Table;
    readonly kpiLogsTable: Table;
    readonly dailyLoginTable: Table;
    constructor(scope: Construct, id: string, props?: StackProps);
}
