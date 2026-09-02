# -*- coding: utf-8 -*-
"""
PASTI - Create DynamoDB Tables
Membuat semua tabel DynamoDB yang dibutuhkan.

Usage:
    python create_dynamodb_tables.py [--region ap-southeast-3] [--delete-first]
"""
import boto3
import argparse
import time


TABLES = [
    {
        "table_name": "pasti-products",
        "key_schema": [{"AttributeName": "product_id", "KeyType": "HASH"}],
        "attribute_definitions": [{"AttributeName": "product_id", "AttributeType": "S"}],
    },
    {
        "table_name": "pasti-sales",
        "key_schema": [{"AttributeName": "sale_id", "KeyType": "HASH"}],
        "attribute_definitions": [{"AttributeName": "sale_id", "AttributeType": "S"}],
        "gsi": [
            {
                "index_name": "product-date-index",
                "key_schema": [
                    {"AttributeName": "product_id", "KeyType": "HASH"},
                    {"AttributeName": "tanggal", "KeyType": "RANGE"},
                ],
                "attribute_definitions": [
                    {"AttributeName": "product_id", "AttributeType": "S"},
                    {"AttributeName": "tanggal", "AttributeType": "S"},
                ],
                "projection": {"ProjectionType": "ALL"},
            }
        ],
    },
    {
        "table_name": "pasti-suppliers",
        "key_schema": [{"AttributeName": "supplier_id", "KeyType": "HASH"}],
        "attribute_definitions": [{"AttributeName": "supplier_id", "AttributeType": "S"}],
    },
    {
        "table_name": "pasti-orders",
        "key_schema": [{"AttributeName": "po_id", "KeyType": "HASH"}],
        "attribute_definitions": [{"AttributeName": "po_id", "AttributeType": "S"}],
        "gsi": [
            {
                "index_name": "status-index",
                "key_schema": [
                    {"AttributeName": "status", "KeyType": "HASH"},
                    {"AttributeName": "created_at", "KeyType": "RANGE"},
                ],
                "attribute_definitions": [
                    {"AttributeName": "status", "AttributeType": "S"},
                    {"AttributeName": "created_at", "AttributeType": "S"},
                ],
                "projection": {"ProjectionType": "ALL"},
            }
        ],
    },
    {
        "table_name": "pasti-agent-logs",
        "key_schema": [{"AttributeName": "trace_id", "KeyType": "HASH"}],
        "attribute_definitions": [{"AttributeName": "trace_id", "AttributeType": "S"}],
    },
    {
        "table_name": "pasti-owner-preferences",
        "key_schema": [{"AttributeName": "pref_key", "KeyType": "HASH"}],
        "attribute_definitions": [{"AttributeName": "pref_key", "AttributeType": "S"}],
    },
]


def create_tables(dynamodb, delete_first=False):
    for table_def in TABLES:
        name = table_def["table_name"]
        print(f"\n--- {name} ---")

        if delete_first:
            try:
                dynamodb.Table(name).delete()
                print(f"  Deleted existing table: {name}")
                dynamodb.Table(name).wait_until_not_exists()
            except dynamodb.meta.client.exceptions.ResourceNotFoundException:
                pass

        # Check if exists
        existing = dynamodb.tables.filter(TableName=name)
        if list(existing):
            print(f"  Already exists: {name}")
            continue

        kwargs = {
            "TableName": name,
            "KeySchema": table_def["key_schema"],
            "AttributeDefinitions": table_def["attribute_definitions"],
            "BillingMode": "PAY_PER_REQUEST",
        }

        if "gsi" in table_def:
            kwargs["GlobalSecondaryIndexes"] = table_def["gsi"]

        table = dynamodb.create_table(**kwargs)
        table.wait_until_exists()
        print(f"  Created: {name} (status: {table.table_status})")


def main():
    parser = argparse.ArgumentParser(description="Create PASTI DynamoDB tables")
    parser.add_argument("--region", default="ap-southeast-3")
    parser.add_argument("--delete-first", action="store_true", help="Delete existing tables first")
    args = parser.parse_args()

    dynamodb = boto3.resource("dynamodb", region_name=args.region)
    print(f"Region: {args.region}")
    create_tables(dynamodb, delete_first=args.delete_first)
    print(f"\nDone. {len(TABLES)} tables ready.")


if __name__ == "__main__":
    main()