# -*- coding: utf-8 -*-
"""
PASTI - EventBridge Scheduler Setup
Membuat daily schedule yang memicu Bedrock Agent setiap malam 20:00 WIB (13:00 UTC).

Usage:
    python create_scheduler.py [--lambda-arn arn:aws:lambda:...:function:PASTI-Orchestrator] [--region ap-southeast-3]
"""
import boto3
import json
import argparse
import uuid


def create_scheduler(lambda_arn, region="ap-southeast-3"):
    scheduler = boto3.client("scheduler", region_name=region)
    iam = boto3.client("iam", region_name=region)
    events = boto3.client("events", region_name=region)

    schedule_name = "pasti-daily-agent-run"
    group_name = "pasti-scheduler-group"

    # 1. Create Scheduler Group (if not exists)
    try:
        scheduler.create_schedule_group(
            Name=group_name,
        )
        print(f"Created scheduler group: {group_name}")
    except scheduler.exceptions.ConflictException:
        print(f"Scheduler group '{group_name}' already exists")

    # 2. Create IAM role for EventBridge Scheduler to invoke Lambda
    role_name = "PASTI-Scheduler-Role"
    assume_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": ["scheduler.amazonaws.com"]},
                "Action": ["sts:AssumeRole"],
            }
        ],
    }

    try:
        iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(assume_policy),
            Description="Allows EventBridge Scheduler to invoke PASTI orchestrator Lambda",
        )
        print(f"Created IAM role: {role_name}")
    except iam.exceptions.EntityAlreadyExistsException:
        print(f"IAM role '{role_name}' already exists")

    # Attach Lambda invoke policy
    iam.put_role_policy(
        RoleName=role_name,
        PolicyName="PASTI-Invoke-Lambda",
        PolicyDocument=json.dumps({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": ["lambda:InvokeFunction"],
                    "Resource": [lambda_arn],
                }
            ],
        }),
    )
    print(f"Attached Lambda invoke policy to {role_name}")

    # Get role ARN
    role_arn = iam.get_role(RoleName=role_name)["Role"]["Arn"]

    # 3. Create the daily schedule
    # WIB (UTC+7) 20:00 = UTC 13:00
    try:
        scheduler.create_schedule(
            Name=schedule_name,
            GroupName=group_name,
            FlexibleTimeWindow={"Mode": "OFF"},
            ScheduleExpression="cron(0 13 * * ? *)",  # 13:00 UTC = 20:00 WIB
            Target={
                "Arn": lambda_arn,
                "RoleArn": role_arn,
            },
            Description="PASTI: Jalankan agent loop harian setiap malam 20:00 WIB",
            State="ENABLED",
        )
        print(f"Created schedule: {schedule_name}")
        print(f"  Cron: 0 13 * * ? * (UTC) = 20:00 WIB setiap hari")
        print(f"  Target: {lambda_arn}")
    except scheduler.exceptions.ConflictException:
        print(f"Schedule '{schedule_name}' already exists. Updating...")
        scheduler.update_schedule(
            Name=schedule_name,
            GroupName=group_name,
            FlexibleTimeWindow={"Mode": "OFF"},
            ScheduleExpression="cron(0 13 * * ? *)",
            Target={
                "Arn": lambda_arn,
                "RoleArn": role_arn,
            },
            Description="PASTI: Jalankan agent loop harian setiap malam 20:00 WIB",
            State="ENABLED",
        )
        print(f"  Updated schedule: {schedule_name}")

    print(f"\nScheduler ready. Agent akan berjalan otomatis setiap malam 20:00 WIB.")
    return schedule_name


def main():
    parser = argparse.ArgumentParser(description="Create PASTI EventBridge Scheduler")
    parser.add_argument(
        "--lambda-arn",
        required=True,
        help="ARN dari orchestrator Lambda function",
    )
    parser.add_argument("--region", default="ap-southeast-3")
    args = parser.parse_args()

    create_scheduler(args.lambda_arn, args.region)


if __name__ == "__main__":
    main()
