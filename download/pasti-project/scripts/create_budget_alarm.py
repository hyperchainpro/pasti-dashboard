# -*- coding: utf-8 -*-
"""
PASTI - AWS Budget Alarm
Setup budget alarm $5/bulan agar tidak ada tagihan tidak terduga.

Usage:
    python create_budget_alarm.py [--email your@email.com] [--amount 5]
"""
import boto3
import argparse


def create_budget_alarm(email, amount, region="ap-southeast-3"):
    client = boto3.client("budgets", region_name=region)
    account_id = boto3.client("sts", region_name=region).get_caller_identity()["Account"]

    budget_name = "PASTI-Monthly-Budget"

    try:
        response = client.create_budget(
            AccountId=account_id,
            Budget={
                "BudgetName": budget_name,
                "BudgetLimit": {"Amount": str(amount), "Unit": "USD"},
                "TimeUnit": "MONTHLY",
                "BudgetType": "COST",
                "CostFilters": {
                    "Service": [
                        "Amazon Bedrock",
                        "AWS Lambda",
                        "Amazon DynamoDB",
                        "Amazon EventBridge",
                        "Amazon API Gateway",
                        "Amazon S3",
                        "Amazon CloudWatch",
                    ]
                },
            },
            NotificationsWithSubscribers=[
                {
                    "Notification": {
                        "NotificationType": "ACTUAL",
                        "ComparisonOperator": "GREATER_THAN",
                        "Threshold": 100.0,  # Alert at 100% of budget
                    },
                    "Subscribers": [
                        {"SubscriptionType": "EMAIL", "Address": email}
                    ],
                },
                {
                    "Notification": {
                        "NotificationType": "FORECASTED",
                        "ComparisonOperator": "GREATER_THAN",
                        "Threshold": 80.0,  # Warn at 80% forecast
                    },
                    "Subscribers": [
                        {"SubscriptionType": "EMAIL", "Address": email}
                    ],
                },
            ],
        )
        print(f"Budget alarm created: {budget_name}")
        print(f"  Limit: ${amount}/bulan")
        print(f"  Alert: {email}")
        print(f"  Actual alert at 100%, Forecast warning at 80%")
    except client.exceptions.DuplicateBudgetException:
        print(f"Budget '{budget_name}' already exists. Skipping.")


def main():
    parser = argparse.ArgumentParser(description="Create PASTI budget alarm")
    parser.add_argument("--email", required=True, help="Email untuk notifikasi")
    parser.add_argument("--amount", type=float, default=5.0, help="Budget USD/bulan (default: 5)")
    parser.add_argument("--region", default="ap-southeast-3")
    args = parser.parse_args()
    create_budget_alarm(args.email, args.amount, args.region)


if __name__ == "__main__":
    main()